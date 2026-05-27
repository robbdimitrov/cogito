#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="thoughts"
NAMESPACE="thoughts"
REGISTRY="localhost:5000/thoughts"

echo "=== Thoughts Kind Deploy Script ==="

# --- prerequisites ---
for cmd in kind kubectl docker make; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

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
echo "Loading images into kind..."
for svc in apigateway authservice database frontend postservice userservice; do
  kind load docker-image "${REGISTRY}/${svc}" --name "${CLUSTER_NAME}"
done

# --- set kubectl context ---
echo "Setting kubectl context to kind-${CLUSTER_NAME}..."
kubectl config use-context "kind-${CLUSTER_NAME}"

# --- deploy ---
echo "Creating namespace and applying manifests..."
kubectl create namespace "${NAMESPACE}" 2>/dev/null || true
kubectl apply -f ./k8s -n "${NAMESPACE}"

# --- restart deployments to pick up new images ---
echo "Restarting deployments to pick up new images..."
for svc in apigateway authservice database frontend postservice userservice; do
  kubectl rollout restart deployment "${svc}" -n "${NAMESPACE}"
done

# --- wait ---
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=thoughts -n "${NAMESPACE}" --timeout=120s

# --- port-forward ---
echo ""
echo "Setup complete. Starting port-forward (Ctrl+C to stop)..."
echo "Frontend will be available at http://localhost:8080/"
kubectl port-forward service/frontend 8080:8080 -n "${NAMESPACE}"
