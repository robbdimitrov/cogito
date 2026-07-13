#!/usr/bin/env bash
set -euo pipefail

# Bring up the full Cogito stack on the current Kubernetes context.
# Idempotent: safe to re-run; reuses the cluster, namespace, and port-forward.

NS="${NS:-cogito}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/deploy"
REGISTRY="${REGISTRY:-localhost:5000/cogito}"
APP_HOST="${APP_HOST:-cogito.localhost}"
LOCAL_PORT="${LOCAL_PORT:-8080}"
REMOTE_PORT="${REMOTE_PORT:-8080}"
PORT_FORWARD_LOG="${PORT_FORWARD_LOG:-/tmp/cogito-port-forward-${LOCAL_PORT}.log}"
PORT_FORWARD_PID_FILE="${PORT_FORWARD_PID_FILE:-/tmp/cogito-port-forward-${LOCAL_PORT}.pid}"
FORCE_BACKFILL="${FORCE_BACKFILL:-0}"
CREATED_NAMESPACE=false

APIGATEWAY_IMAGE_TAG="${APIGATEWAY_IMAGE_TAG:-}"
AUTHSERVICE_IMAGE_TAG="${AUTHSERVICE_IMAGE_TAG:-}"
DATABASE_IMAGE_TAG="${DATABASE_IMAGE_TAG:-}"
FLOWSERVICE_IMAGE_TAG="${FLOWSERVICE_IMAGE_TAG:-}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-}"
IMAGESERVICE_IMAGE_TAG="${IMAGESERVICE_IMAGE_TAG:-}"
POSTSERVICE_IMAGE_TAG="${POSTSERVICE_IMAGE_TAG:-}"
USERSERVICE_IMAGE_TAG="${USERSERVICE_IMAGE_TAG:-}"

STATIC_MANIFESTS=(pdb.yaml networkpolicy.yaml)
INFRA_MANIFESTS=(storage.yaml cache.yaml search.yaml)
DATABASE_MANIFESTS=(database.yaml)
BROKER_MANIFEST="broker.yaml"

ROLL_OUT_DATABASE=(statefulset/database)
ROLL_OUT_STATEFUL=(
  statefulset/storage
  statefulset/cache
  statefulset/search
  statefulset/broker
)
ROLL_OUT_DEPLOYMENTS=(
  deployment/apigateway
  deployment/authservice
  deployment/flowservice
  deployment/frontend
  deployment/imageservice
  deployment/postservice
  deployment/userservice
)
ROLL_OUT_CONNECT=(deployment/connect)

log() {
  echo "==> $*"
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_tools() {
  local tool
  for tool in kubectl docker make openssl awk; do
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

ensure_database_url() {
  local app_password url
  app_password="$(secret_value cogito-app-password)"
  [[ -n "${app_password}" ]] || die "cogito-app-password is required before database-url can be generated"

  url="$(secret_value database-url)"
  if [[ -z "${url}" ]]; then
    log "adding missing generated secret key: database-url"
    kubectl -n "${NS}" patch secret cogito-db-secret --type merge \
      -p "{\"stringData\":{\"database-url\":\"postgresql://cogito_app:${app_password}@database:5432/cogito?sslmode=disable\"}}"
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
  local postgres_password app_password
  postgres_password="$(random_secret)"
  app_password="$(random_secret)"
  kubectl -n "${NS}" create secret generic cogito-db-secret \
    --from-literal=database-password="${postgres_password}" \
    --from-literal=cogito-app-password="${app_password}" \
    --from-literal=database-url="postgresql://cogito_app:${app_password}@database:5432/cogito?sslmode=disable" \
    --from-literal=internal-grpc-token="$(random_secret)" \
    --from-literal=session-hmac-secret="$(random_secret)" \
    --from-literal=search-master-key="$(random_secret)" \
    --from-literal=s3-access-key="$(random_secret)" \
    --from-literal=s3-secret-key="$(random_secret)" \
    --from-literal=s3-provisioning-access-key="$(random_secret)" \
    --from-literal=s3-provisioning-secret-key="$(random_secret)"
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

context_checksum() {
  (
    cd "${ROOT}"
    for dir in "$@"; do
      find "${dir}" -type f \
        ! -path '*/.git/*' \
        ! -path '*/bin/*' \
        ! -path '*/tmp/*' \
        ! -path '*/target/*' \
        ! -path '*/coverage/*' \
        ! -path '*/node_modules/*' \
        ! -path '*/.svelte-kit/*' \
        ! -path '*/build/*' \
        ! -path '*/dist/*'
    done | LC_ALL=C sort -u | while IFS= read -r file; do
      case "${file}" in
        apps/frontend/.env | apps/frontend/.env.*)
          [[ "${file}" == "apps/frontend/.env.example" ]] || continue
          ;;
      esac
      printf '%s\0' "${file}"
      openssl dgst -sha256 -binary "${file}"
    done
  ) | openssl dgst -sha256 -r | awk '{print substr($1, 1, 12)}'
}

init_image_tags() {
  APIGATEWAY_IMAGE_TAG="${APIGATEWAY_IMAGE_TAG:-$(context_checksum apps/apigateway pkg/pb)}"
  AUTHSERVICE_IMAGE_TAG="${AUTHSERVICE_IMAGE_TAG:-$(context_checksum apps/authservice pkg/pb)}"
  DATABASE_IMAGE_TAG="${DATABASE_IMAGE_TAG:-$(context_checksum apps/database)}"
  FLOWSERVICE_IMAGE_TAG="${FLOWSERVICE_IMAGE_TAG:-$(context_checksum apps/flowservice pkg/pb)}"
  FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-$(context_checksum apps/frontend)}"
  IMAGESERVICE_IMAGE_TAG="${IMAGESERVICE_IMAGE_TAG:-$(context_checksum apps/imageservice pkg/pb)}"
  POSTSERVICE_IMAGE_TAG="${POSTSERVICE_IMAGE_TAG:-$(context_checksum apps/postservice pkg/pb)}"
  USERSERVICE_IMAGE_TAG="${USERSERVICE_IMAGE_TAG:-$(context_checksum apps/userservice pkg/pb)}"
}

build_one_image() {
  local target="$1"
  local tag="$2"
  make -C "${ROOT}" "${target}" IMAGE_PREFIX="${REGISTRY}" GIT_SHA="${tag}"
}

build_images() {
  log "building images"
  log "image tags: apigateway=${APIGATEWAY_IMAGE_TAG} authservice=${AUTHSERVICE_IMAGE_TAG} database=${DATABASE_IMAGE_TAG} flowservice=${FLOWSERVICE_IMAGE_TAG} frontend=${FRONTEND_IMAGE_TAG} imageservice=${IMAGESERVICE_IMAGE_TAG} postservice=${POSTSERVICE_IMAGE_TAG} userservice=${USERSERVICE_IMAGE_TAG}"
  export DOCKER_BUILDKIT=1
  build_one_image apigateway "${APIGATEWAY_IMAGE_TAG}"
  build_one_image authservice "${AUTHSERVICE_IMAGE_TAG}"
  build_one_image database "${DATABASE_IMAGE_TAG}"
  build_one_image flowservice "${FLOWSERVICE_IMAGE_TAG}"
  build_one_image frontend "${FRONTEND_IMAGE_TAG}"
  build_one_image imageservice "${IMAGESERVICE_IMAGE_TAG}"
  build_one_image postservice "${POSTSERVICE_IMAGE_TAG}"
  build_one_image userservice "${USERSERVICE_IMAGE_TAG}"
}

apply_manifest_files() {
  local files=()
  local manifest
  for manifest in "$@"; do
    files+=("-f" "${K8S_DIR}/${manifest}")
  done
  kubectl apply "${files[@]}" -n "${NS}" >/dev/null
}

select_manifest_documents() {
  local manifest="$1"
  local mode="$2"
  local kind="$3"
  local name="$4"
  awk -v mode="${mode}" -v want_kind="${kind}" -v want_name="${name}" '
    function reset() {
      doc = ""
      doc_kind = ""
      doc_name = ""
      in_metadata = 0
    }
    function should_emit() {
      matched = (doc_kind == want_kind && doc_name == want_name)
      return mode == "only" ? matched : !matched
    }
    function emit() {
      if (doc != "" && should_emit()) {
        printf "%s---\n", doc
      }
    }
    /^---[[:space:]]*$/ {
      emit()
      reset()
      next
    }
    {
      doc = doc $0 "\n"
    }
    /^kind:[[:space:]]*/ {
      doc_kind = $2
    }
    /^metadata:[[:space:]]*$/ {
      in_metadata = 1
      next
    }
    /^[^[:space:]]/ && $0 !~ /^metadata:/ {
      in_metadata = 0
    }
    in_metadata && /^[[:space:]]+name:[[:space:]]*/ {
      doc_name = $2
    }
    END {
      emit()
    }
  ' "${K8S_DIR}/${manifest}"
}

append_rendered_deployment_manifest() {
  local rendered="$1"
  local manifest="$2"
  local name="$3"
  local deployment
  deployment="$(mktemp)"
  shift 3

  select_manifest_documents "${manifest}" except Deployment "${name}" >> "${rendered}"
  select_manifest_documents "${manifest}" only Deployment "${name}" > "${deployment}"
  # kubectl's -o yaml output has no trailing `---`; without one here, the next
  # append merges into this document via YAML's last-key-wins duplicate-key
  # rule instead of starting a new one.
  if ! kubectl set image --local -o yaml -f "${deployment}" "$@" >> "${rendered}"; then
    rm -f "${deployment}"
    return 1
  fi
  echo "---" >> "${rendered}"
  rm -f "${deployment}"
}

apply_rendered_app_manifests() {
  local rendered
  rendered="$(mktemp)"
  trap 'rm -f "${rendered}"' RETURN

  append_rendered_deployment_manifest "${rendered}" apigateway.yaml apigateway \
    migration="${REGISTRY}/database:${DATABASE_IMAGE_TAG}" \
    apigateway="${REGISTRY}/apigateway:${APIGATEWAY_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" authservice.yaml authservice \
    authservice="${REGISTRY}/authservice:${AUTHSERVICE_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" flowservice.yaml flowservice \
    flowservice="${REGISTRY}/flowservice:${FLOWSERVICE_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" frontend.yaml frontend \
    frontend="${REGISTRY}/frontend:${FRONTEND_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" imageservice.yaml imageservice \
    imageservice="${REGISTRY}/imageservice:${IMAGESERVICE_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" postservice.yaml postservice \
    postservice="${REGISTRY}/postservice:${POSTSERVICE_IMAGE_TAG}"
  append_rendered_deployment_manifest "${rendered}" userservice.yaml userservice \
    userservice="${REGISTRY}/userservice:${USERSERVICE_IMAGE_TAG}"

  kubectl apply -f "${rendered}" -n "${NS}" >/dev/null
  trap - RETURN
  rm -f "${rendered}"
}

apply_broker_infra_manifest() {
  local rendered
  rendered="$(mktemp)"
  trap 'rm -f "${rendered}"' RETURN
  select_manifest_documents "${BROKER_MANIFEST}" except Job broker-backfill > "${rendered}"
  kubectl apply -f "${rendered}" -n "${NS}" >/dev/null
  trap - RETURN
  rm -f "${rendered}"
}

data_resource_checksum() {
  local kind="$1"
  local name="$2"
  kubectl -n "${NS}" get "${kind}" "${name}" -o go-template='{{ range $k, $v := .data }}{{ printf "%s=%s\n" $k $v }}{{ end }}' \
    | LC_ALL=C sort \
    | openssl dgst -sha256 -r | awk '{print $1}'
}

annotate_data_resource_checksums() {
  local kind="$1"
  local resource="$2"
  shift 2
  local name pairs=()
  for name in "$@"; do
    pairs+=("\"checksum/${name}\":\"$(data_resource_checksum "${kind}" "${name}")\"")
  done
  local joined
  joined="$(IFS=,; echo "${pairs[*]}")"
  kubectl -n "${NS}" patch "${resource}" --type merge \
    -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{${joined}}}}}}" >/dev/null
}

annotate_secret_checksums() {
  local resource="$1"
  shift
  annotate_data_resource_checksums secret "${resource}" "$@"
}

annotate_configmap_checksums() {
  local resource="$1"
  shift
  annotate_data_resource_checksums configmap "${resource}" "$@"
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

run_broker_backfill() {
  local complete
  complete="$(kubectl -n "${NS}" get job broker-backfill -o jsonpath='{range .status.conditions[?(@.type=="Complete")]}{.status}{end}' 2>/dev/null || true)"
  if [[ "${FORCE_BACKFILL}" != "1" && "${complete}" == "True" ]]; then
    log "broker backfill already complete"
    return 0
  fi

  log "running broker backfill"
  local manifest
  manifest="$(mktemp)"
  trap 'rm -f "${manifest}"' RETURN
  select_manifest_documents "${BROKER_MANIFEST}" only Job broker-backfill > "${manifest}"
  kubectl -n "${NS}" delete job broker-backfill --ignore-not-found --wait=true >/dev/null
  kubectl apply -f "${manifest}" -n "${NS}" >/dev/null
  trap - RETURN
  rm -f "${manifest}"
  if kubectl -n "${NS}" wait --for=condition=complete job/broker-backfill --timeout=180s; then
    return 0
  fi
  echo "error: broker backfill failed or timed out" >&2
  kubectl -n "${NS}" logs job/broker-backfill --tail=80 || true
  exit 1
}

apply_manifests() {
  log "creating namespace and provisioning secrets"
  ensure_namespace
  ensure_secret
  apply_manifest_files "${STATIC_MANIFESTS[@]}"

  log "applying infra dependencies"
  apply_manifest_files "${INFRA_MANIFESTS[@]}"
  apply_broker_infra_manifest
  annotate_secret_checksums statefulset/storage cogito-db-secret
  annotate_secret_checksums statefulset/search cogito-db-secret
  wait_for_rollouts "${ROLL_OUT_STATEFUL[@]}"

  log "applying database"
  apply_manifest_files "${DATABASE_MANIFESTS[@]}"
  annotate_secret_checksums statefulset/database cogito-db-secret
  wait_for_rollouts "${ROLL_OUT_DATABASE[@]}"

  log "applying application services"
  apply_rendered_app_manifests
  kubectl -n "${NS}" set env deployment/frontend ORIGIN="http://${APP_HOST}:${LOCAL_PORT}" >/dev/null
  annotate_secret_checksums deployment/apigateway cogito-db-secret
  annotate_secret_checksums deployment/authservice cogito-db-secret
  annotate_secret_checksums deployment/flowservice cogito-db-secret
  annotate_secret_checksums deployment/imageservice cogito-db-secret
  annotate_secret_checksums deployment/postservice cogito-db-secret
  annotate_secret_checksums deployment/userservice cogito-db-secret
  wait_for_rollouts "${ROLL_OUT_DEPLOYMENTS[@]}"

  log "checking connect inputs"
  annotate_secret_checksums deployment/connect cogito-db-secret
  annotate_configmap_checksums deployment/connect broker-pipelines
  wait_for_rollouts "${ROLL_OUT_CONNECT[@]}"

  run_broker_backfill
}

start_port_forward_background() {
  local supervisor_pid

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
init_image_tags

if [[ -n "$(port_pids)" ]]; then
  echo "note: local port ${LOCAL_PORT} is already in use; deploy will reuse a frontend port-forward or report the conflict." >&2
fi

build_images
apply_manifests
start_port_forward_background
print_summary
