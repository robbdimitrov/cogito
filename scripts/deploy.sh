#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="thoughts"
NAMESPACE="thoughts"
REGISTRY="localhost:5000/thoughts"
LOCAL_PORT="${LOCAL_PORT:-8080}"
REMOTE_PORT="${REMOTE_PORT:-8080}"
PORT_FORWARD_LOG="${PORT_FORWARD_LOG:-/tmp/thoughts-port-forward-${LOCAL_PORT}.log}"
PORT_FORWARD_PID_FILE="${PORT_FORWARD_PID_FILE:-/tmp/thoughts-port-forward-${LOCAL_PORT}.pid}"

echo "=== Thoughts Kind Deploy Script ==="

port_pids() {
  if command -v lsof &>/dev/null; then
    lsof -nP -iTCP:"${LOCAL_PORT}" -sTCP:LISTEN -t 2>/dev/null || true
  fi
}

is_frontend_port_forward() {
  local pid="$1"
  local command
  command="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ "${command}" == *"kubectl"* ]] &&
    [[ "${command}" == *"port-forward"* ]] &&
    [[ "${command}" == *"service/frontend"* ]] &&
    [[ "${command}" == *"${LOCAL_PORT}:${REMOTE_PORT}"* ]] &&
    [[ "${command}" == *"${NAMESPACE}"* ]]
}

handle_existing_port_forward() {
  local pids pid
  pids="$(port_pids)"
  if [ -z "${pids}" ]; then
    return 1
  fi

  while IFS= read -r pid; do
    if is_frontend_port_forward "${pid}"; then
      echo "Frontend port-forward is already running on http://localhost:${LOCAL_PORT}/ (pid ${pid})."
      return 0
    fi
  done <<< "${pids}"

  echo "Error: Local port ${LOCAL_PORT} is already in use by another process:" >&2
  while IFS= read -r pid; do
    ps -p "${pid}" -o pid=,command= >&2 || true
  done <<< "${pids}"
  echo "Stop that process or rerun with a different port, for example: LOCAL_PORT=8081 $0" >&2
  exit 1
}

start_port_forward_background() {
  local supervisor_pid

  if handle_existing_port_forward; then
    return 0
  fi

  LOCAL_PORT="${LOCAL_PORT}" REMOTE_PORT="${REMOTE_PORT}" NAMESPACE="${NAMESPACE}" \
    nohup bash -c '
    set -u
    while true; do
      kubectl port-forward service/frontend "${LOCAL_PORT}:${REMOTE_PORT}" -n "${NAMESPACE}"
      status=$?
      echo "Port-forward exited with status ${status}. Reconnecting in 3 seconds..." >&2
      sleep 3
    done
  ' >> "${PORT_FORWARD_LOG}" 2>&1 &

  supervisor_pid=$!
  disown "${supervisor_pid}" 2>/dev/null || true
  echo "${supervisor_pid}" > "${PORT_FORWARD_PID_FILE}"

  sleep 2
  if handle_existing_port_forward; then
    echo "Background port-forward supervisor pid: ${supervisor_pid}"
    echo "Logs: ${PORT_FORWARD_LOG}"
    echo "PID file: ${PORT_FORWARD_PID_FILE}"
    return 0
  fi

  if ps -p "${supervisor_pid}" >/dev/null 2>&1; then
    echo "Background port-forward is starting on http://localhost:${LOCAL_PORT}/ (supervisor pid ${supervisor_pid})."
    echo "Logs: ${PORT_FORWARD_LOG}"
    echo "PID file: ${PORT_FORWARD_PID_FILE}"
    return 0
  fi

  echo "Error: Failed to start background port-forward. Recent logs:" >&2
  tail -30 "${PORT_FORWARD_LOG}" >&2 || true
  exit 1
}

# --- prerequisites ---
for cmd in kind kubectl docker make; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

# --- check if docker daemon is running ---
if ! docker info &>/dev/null; then
  echo "Error: Docker daemon is not running. Please start Docker and try again." >&2
  exit 1
fi

# --- check local port availability ---
if [ -n "$(port_pids)" ]; then
  echo "Note: Local port ${LOCAL_PORT} is already in use. The deploy will continue, then reuse or report it." >&2
fi

# --- kind cluster ---
if ! kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
  echo "Creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "${CLUSTER_NAME}"
else
  echo "Using existing kind cluster '${CLUSTER_NAME}'."
fi

# --- build images ---
echo "Building images..."
make

# --- load images into kind ---
echo "Loading images into kind (in parallel)..."
services=(apigateway authservice database frontend postservice userservice)
load_pids=()
for svc in "${services[@]}"; do
  kind load docker-image "${REGISTRY}/${svc}" --name "${CLUSTER_NAME}" &
  load_pids+=($!)
done

# Wait for all loads to complete and catch any failures
failed_loads=()
num_services=${#services[@]}
for ((i=0; i<num_services; i++)); do
  svc="${services[$i]}"
  pid="${load_pids[$i]}"
  if ! wait "$pid"; then
    failed_loads+=("$svc")
  fi
done

if [ ${#failed_loads[@]} -ne 0 ]; then
  echo "Error: Failed to load the following images into kind: ${failed_loads[*]}" >&2
  exit 1
fi

# --- set kubectl context ---
echo "Setting kubectl context to kind-${CLUSTER_NAME}..."
kubectl config use-context "kind-${CLUSTER_NAME}"

# --- deploy ---
echo "Creating namespace and applying manifests..."
kubectl create namespace "${NAMESPACE}" 2>/dev/null || true
kubectl apply -f ./k8s -n "${NAMESPACE}"

# --- restart database first to avoid backend connection failures ---
echo "Restarting database deployment..."
kubectl rollout restart deployment/database -n "${NAMESPACE}"
echo "Waiting for database to be ready..."
if ! kubectl rollout status deployment/database -n "${NAMESPACE}" --timeout=60s; then
  echo "Error: Database failed to start. Recent database pod logs:" >&2
  kubectl logs -l tier=database -n "${NAMESPACE}" --tail=30 || true
  exit 1
fi

# --- restart other deployments ---
echo "Restarting service deployments to pick up new images..."
restart_services=(apigateway authservice frontend postservice userservice)
for svc in "${restart_services[@]}"; do
  kubectl rollout restart deployment/"${svc}" -n "${NAMESPACE}"
done

# --- wait for services ---
echo "Waiting for services to be ready..."
rollout_pids=()
for svc in "${restart_services[@]}"; do
  kubectl rollout status deployment/"${svc}" -n "${NAMESPACE}" --timeout=120s &
  rollout_pids+=($!)
done

failed_rollouts=()
num_restart_services=${#restart_services[@]}
for ((i=0; i<num_restart_services; i++)); do
  svc="${restart_services[$i]}"
  pid="${rollout_pids[$i]}"
  if ! wait "$pid"; then
    failed_rollouts+=("$svc")
  fi
done

if [ ${#failed_rollouts[@]} -ne 0 ]; then
  echo "Error: The following deployments failed to roll out: ${failed_rollouts[*]}" >&2
  echo "=== Current Pod Statuses ==="
  kubectl get pods -n "${NAMESPACE}"
  for svc in "${failed_rollouts[@]}"; do
    echo "=== Logs for failed service: ${svc} ==="
    kubectl logs deployment/"${svc}" -n "${NAMESPACE}" --tail=30 || true
  done
  exit 1
fi

# --- port-forward ---
echo ""
echo "Setup complete. Starting port-forward in the background..."
echo "Frontend will be available at http://localhost:${LOCAL_PORT}/"
start_port_forward_background
