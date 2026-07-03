#!/usr/bin/env bash
set -euo pipefail

# Bring up the full Cogito stack on the current Kubernetes context.
# Idempotent: safe to re-run; reuses the cluster, namespace, and port-forward.

NS="${NS:-cogito}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/deploy"
REGISTRY="${REGISTRY:-localhost:5000/cogito}"
GIT_SHA="${GIT_SHA:-$(git -C "${ROOT}" rev-parse --short HEAD)}"
APP_HOST="${APP_HOST:-cogito.localhost}"
LOCAL_PORT="${LOCAL_PORT:-8080}"
REMOTE_PORT="${REMOTE_PORT:-8080}"
PORT_FORWARD_LOG="${PORT_FORWARD_LOG:-/tmp/cogito-port-forward-${LOCAL_PORT}.log}"
PORT_FORWARD_PID_FILE="${PORT_FORWARD_PID_FILE:-/tmp/cogito-port-forward-${LOCAL_PORT}.pid}"
CREATED_NAMESPACE=false

ROLL_OUT_DATABASE=(statefulset/database)
ROLL_OUT_STATEFUL=(
  statefulset/cache
  statefulset/storage
  statefulset/search
  statefulset/broker
)
ROLL_OUT_DEPLOYMENTS=(
  deployment/apigateway
  deployment/authservice
  deployment/connect
  deployment/flowservice
  deployment/frontend
  deployment/imageservice
  deployment/postservice
  deployment/userservice
)
DEPLOYMENT_REPLICAS=(
  apigateway=1
  authservice=1
  connect=1
  flowservice=2
  frontend=1
  imageservice=1
  postservice=1
  userservice=1
)

log() {
  echo "==> $*"
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_tools() {
  local tool
  for tool in kubectl docker make openssl; do
    command -v "$tool" >/dev/null || die "missing required tool: $tool"
  done
}

require_docker() {
  docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and try again."
}

random_secret() {
  if command -v openssl >/dev/null; then
    openssl rand -hex 32
    return
  fi

  local secret
  secret="$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 64 || true)"
  [[ ${#secret} -eq 64 ]] || die "failed to generate a secret"
  printf '%s\n' "${secret}"
}

secret_has_key() {
  local key="$1"
  [[ -n "$(kubectl -n "${NS}" get secret cogito-db-secret -o "go-template={{ index .data \"${key}\" }}" 2>/dev/null || true)" ]]
}

secret_value() {
  local key="$1"
  kubectl -n "${NS}" get secret cogito-db-secret -o "go-template={{ index .data \"${key}\" | base64decode }}" 2>/dev/null || true
}

ensure_secret_key() {
  local key="$1"
  if secret_has_key "${key}"; then
    return
  fi

  log "adding missing generated secret key: ${key}"
  kubectl -n "${NS}" patch secret cogito-db-secret --type merge \
    -p "{\"stringData\":{\"${key}\":\"$(random_secret)\"}}"
}

database_url_with_sslmode() {
  local url="$1"
  if [[ "${url}" == *"sslmode=require"* ]]; then
    printf '%s\n' "${url}"
  elif [[ "${url}" =~ ^(.*[\?\&]sslmode=)[^\&]*(.*)$ ]]; then
    printf '%srequire%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
  elif [[ "${url}" == *"?"* ]]; then
    printf '%s&sslmode=require\n' "${url}"
  else
    printf '%s?sslmode=require\n' "${url}"
  fi
}

ensure_database_url() {
  local app_password url required_url
  app_password="$(secret_value cogito-app-password)"
  [[ -n "${app_password}" ]] || die "cogito-app-password is required before database-url can be generated"

  url="$(secret_value database-url)"
  if [[ -z "${url}" ]]; then
    log "adding missing generated secret key: database-url"
    required_url="postgresql://cogito_app:${app_password}@database:5432/cogito?sslmode=require"
  else
    required_url="$(database_url_with_sslmode "${url}")"
  fi

  if [[ "${url}" != "${required_url}" ]]; then
    log "updating database-url to require PostgreSQL TLS"
    kubectl -n "${NS}" patch secret cogito-db-secret --type merge \
      -p "{\"stringData\":{\"database-url\":\"${required_url}\"}}"
  fi
}

ensure_namespace() {
  if kubectl create namespace "${NS}" 2>/dev/null; then
    CREATED_NAMESPACE=true
  fi
}

ensure_secret() {
  if kubectl -n "${NS}" get secret cogito-db-secret >/dev/null 2>&1; then
    ensure_secret_key database-password
    ensure_secret_key cogito-app-password
    ensure_database_url
    ensure_secret_key internal-grpc-token
    ensure_secret_key session-hmac-secret
    ensure_secret_key search-master-key
    ensure_secret_key s3-access-key
    ensure_secret_key s3-secret-key
    ensure_secret_key s3-provisioning-access-key
    ensure_secret_key s3-provisioning-secret-key
    return
  fi

  log "creating generated database and service secrets"
  local postgres_password
  local app_password
  postgres_password="$(random_secret)"
  app_password="$(random_secret)"
  kubectl -n "${NS}" create secret generic cogito-db-secret \
    --from-literal=database-password="${postgres_password}" \
    --from-literal=cogito-app-password="${app_password}" \
    --from-literal=database-url="postgresql://cogito_app:${app_password}@database:5432/cogito?sslmode=require" \
    --from-literal=internal-grpc-token="$(random_secret)" \
    --from-literal=session-hmac-secret="$(random_secret)" \
    --from-literal=search-master-key="$(random_secret)" \
    --from-literal=s3-access-key="$(random_secret)" \
    --from-literal=s3-secret-key="$(random_secret)" \
    --from-literal=s3-provisioning-access-key="$(random_secret)" \
    --from-literal=s3-provisioning-secret-key="$(random_secret)"
}

ensure_database_tls_secret() {
  local secret_name="database-tls"
  local tmpdir
  if kubectl -n "${NS}" get secret "${secret_name}" >/dev/null 2>&1; then
    return
  fi
  command -v openssl >/dev/null || die "missing required tool for database TLS secret: openssl"

  log "creating self-signed TLS secret for database"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "${tmpdir}"' RETURN
  openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
    -keyout "${tmpdir}/tls.key" \
    -out "${tmpdir}/tls.crt" \
    -subj "/CN=database" \
    -addext "subjectAltName=DNS:database,DNS:database.${NS}.svc.cluster.local" >/dev/null 2>&1
  kubectl -n "${NS}" create secret tls "${secret_name}" \
    --cert="${tmpdir}/tls.crt" \
    --key="${tmpdir}/tls.key" >/dev/null
  trap - RETURN
  rm -rf "${tmpdir}"
}

port_pids() {
  if command -v lsof >/dev/null; then
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
    [[ "${command}" == *"${NS}"* ]]
}

handle_existing_port_forward() {
  local pids pid
  pids="$(port_pids)"
  if [[ -z "${pids}" ]]; then
    return 1
  fi

  while IFS= read -r pid; do
    if is_frontend_port_forward "${pid}"; then
      echo "Frontend port-forward is already running on http://${APP_HOST}:${LOCAL_PORT}/ (pid ${pid})."
      return 0
    fi
  done <<< "${pids}"

  echo "error: local port ${LOCAL_PORT} is already in use by another process:" >&2
  while IFS= read -r pid; do
    ps -p "${pid}" -o pid=,command= >&2 || true
  done <<< "${pids}"
  echo "Stop that process or rerun with a different port, for example:" >&2
  echo "  LOCAL_PORT=8081 $0" >&2
  exit 1
}

build_images() {
  log "building images"
  export DOCKER_BUILDKIT=1
  export GIT_SHA
  make -C "${ROOT}" IMAGE_PREFIX="${REGISTRY}" GIT_SHA="${GIT_SHA}"
}

apply_manifests() {
  log "creating namespace and applying manifests"
  ensure_namespace
  ensure_secret
  ensure_database_tls_secret
  kubectl apply -f "${K8S_DIR}" -n "${NS}"
  kubectl -n "${NS}" set image deployment/apigateway migration="${REGISTRY}/database:${GIT_SHA}" apigateway="${REGISTRY}/apigateway:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/authservice authservice="${REGISTRY}/authservice:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/flowservice flowservice="${REGISTRY}/flowservice:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/frontend frontend="${REGISTRY}/frontend:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/imageservice imageservice="${REGISTRY}/imageservice:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/postservice postservice="${REGISTRY}/postservice:${GIT_SHA}" >/dev/null
  kubectl -n "${NS}" set image deployment/userservice userservice="${REGISTRY}/userservice:${GIT_SHA}" >/dev/null
}

rollout_restart() {
  local resource
  for resource in "$@"; do
    kubectl -n "${NS}" rollout restart "${resource}"
  done
}

wait_for_rollouts() {
  local failed=()
  local resource
  for resource in "$@"; do
    if ! kubectl -n "${NS}" rollout status "${resource}" --timeout=180s; then
      failed+=("${resource}")
    fi
  done

  if [[ ${#failed[@]} -eq 0 ]]; then
    return 0
  fi

  echo "error: rollout failed for: ${failed[*]}" >&2
  echo "==> current pod statuses"
  kubectl -n "${NS}" get pods
  for resource in "${failed[@]}"; do
    echo "==> recent logs for ${resource}"
    kubectl -n "${NS}" logs "${resource}" --tail=40 || true
  done
  exit 1
}

restart_stack() {
  local deployment replica
  log "pausing deployments while dependencies restart"
  for deployment in "${DEPLOYMENT_REPLICAS[@]}"; do
    kubectl -n "${NS}" scale "deployment/${deployment%%=*}" --replicas=0
  done

  log "restarting database"
  rollout_restart "${ROLL_OUT_DATABASE[@]}"
  wait_for_rollouts "${ROLL_OUT_DATABASE[@]}"

  log "restarting stateful services"
  rollout_restart "${ROLL_OUT_STATEFUL[@]}"
  wait_for_rollouts "${ROLL_OUT_STATEFUL[@]}"

  log "starting deployments"
  for deployment in "${DEPLOYMENT_REPLICAS[@]}"; do
    replica="${deployment#*=}"
    kubectl -n "${NS}" scale "deployment/${deployment%%=*}" --replicas="${replica}"
  done
  wait_for_rollouts "${ROLL_OUT_DEPLOYMENTS[@]}"
}

start_port_forward_background() {
  local supervisor_pid

  # Terminate any existing frontend port-forward to this port to avoid stale connections
  local pids pid
  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    while IFS= read -r pid; do
      if is_frontend_port_forward "${pid}"; then
        log "stopping existing frontend port-forward (pid ${pid})"
        kill "${pid}" 2>/dev/null || true
      fi
    done <<< "${pids}"
    sleep 1
  fi

  if handle_existing_port_forward; then
    return 0
  fi

  log "starting frontend port-forward in the background"
  LOCAL_PORT="${LOCAL_PORT}" REMOTE_PORT="${REMOTE_PORT}" NS="${NS}" \
    nohup bash -c '
    set -u
    while true; do
      kubectl -n "${NS}" port-forward service/frontend "${LOCAL_PORT}:${REMOTE_PORT}"
      status=$?
      echo "port-forward exited with status ${status}; reconnecting in 3 seconds" >&2
      sleep 3
    done
  ' >> "${PORT_FORWARD_LOG}" 2>&1 &

  supervisor_pid=$!
  disown "${supervisor_pid}" 2>/dev/null || true
  echo "${supervisor_pid}" > "${PORT_FORWARD_PID_FILE}"

  sleep 2
  if handle_existing_port_forward; then
    echo "Background port-forward supervisor pid: ${supervisor_pid}"
    return 0
  fi

  if ps -p "${supervisor_pid}" >/dev/null 2>&1; then
    echo "Background port-forward is starting on http://${APP_HOST}:${LOCAL_PORT}/ (supervisor pid ${supervisor_pid})."
    return 0
  fi

  echo "error: failed to start background port-forward. Recent logs:" >&2
  tail -30 "${PORT_FORWARD_LOG}" >&2 || true
  exit 1
}

print_summary() {
  cat <<EOF

==> cogito is up

  Frontend       http://${APP_HOST}:${LOCAL_PORT}
  Gateway        in-cluster: http://apigateway:8080
  Namespace      ${NS}
  Registry       ${REGISTRY}
  Context        $(kubectl config current-context 2>/dev/null || echo "unknown")

  Port-forward   supervisor pid: $(cat "${PORT_FORWARD_PID_FILE}" 2>/dev/null || echo "unknown")
                 logs: ${PORT_FORWARD_LOG}
                 stop: kill \$(cat ${PORT_FORWARD_PID_FILE})

  Pods           kubectl -n ${NS} get pods
  Logs           kubectl -n ${NS} logs deployment/<service> --tail=100
  Tear down      kubectl delete -f ${K8S_DIR} -n ${NS}

EOF
}

require_tools
require_docker

if [[ -n "$(port_pids)" ]]; then
  echo "note: local port ${LOCAL_PORT} is already in use; deploy will reuse a frontend port-forward or report the conflict." >&2
fi

build_images
apply_manifests
restart_stack
start_port_forward_background
print_summary
