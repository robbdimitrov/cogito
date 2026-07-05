#!/usr/bin/env sh
set -eu

namespace="${NAMESPACE:-cogito}"
timeout="${TIMEOUT:-180s}"

restart() {
  kind="$1"
  name="$2"
  if kubectl -n "$namespace" get "$kind" "$name" >/dev/null 2>&1; then
    kubectl -n "$namespace" rollout restart "$kind/$name"
    kubectl -n "$namespace" rollout status "$kind/$name" --timeout="$timeout"
  fi
}

check_deployment() {
  name="$1"
  kubectl -n "$namespace" wait --for=condition=available "deployment/$name" --timeout="$timeout"
}

restart statefulset database
restart statefulset cache
restart statefulset broker
restart statefulset search
restart statefulset storage

check_deployment apigateway
check_deployment authservice
check_deployment userservice
check_deployment postservice
check_deployment imageservice
check_deployment flowservice

echo "dependency restart drill completed for namespace $namespace"
