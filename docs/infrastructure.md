# Infrastructure

## Kubernetes Resources

### Application Deployments

| Service      | Replicas | CPU req | Mem req | Mem limit |
| ------------ | -------- | ------- | ------- | --------- |
| frontend     | 1        | 250m    | 256Mi   | 512Mi     |
| apigateway   | 1        | 100m    | 64Mi    | 128Mi     |
| authservice  | 1        | 50m     | 32Mi    | 128Mi     |
| postservice  | 1        | 100m    | 64Mi    | 128Mi     |
| userservice  | 1        | 50m     | 32Mi    | 128Mi     |
| imageservice | 1        | 75m     | 64Mi    | 256Mi     |
| flowservice  | 2        | 100m    | 128Mi   | 256Mi     |

### Infrastructure StatefulSets

| Service                                  | CPU req | Mem req | Mem limit | PVC size |
| ---------------------------------------- | ------- | ------- | --------- | -------- |
| database (postgres:18.4-alpine)          | 500m    | 512Mi   | 512Mi     | 5 Gi     |
| cache (dragonflydb)                      | 100m    | 64Mi    | 256Mi     | 1 Gi     |
| storage (chrislusf/seaweedfs)            | 100m    | 64Mi    | 256Mi     | 5 Gi     |
| search (getmeili/meilisearch:v1.15)      | 100m    | 256Mi   | 512Mi     | 1 Gi     |
| broker (redpandadata/redpanda)           | 100m    | 256Mi   | 512Mi     | 2 Gi     |

Redpanda Connect runs as a Deployment and mounts broker pipeline configuration
from a ConfigMap. All PVCs: ReadWriteOnce. All StatefulSets: 1 replica.
PostgreSQL serves in-cluster connections with TLS enabled from the
`database-tls` Secret mounted at `/certs`; clients use `sslmode=require` in the
shared `database-url` Secret value.

### PodDisruptionBudgets

Single-replica stateful services (`database`, `cache`, `storage`, `search`, and
`broker`) set `maxUnavailable: 0`. Application and connect Deployments set
`minAvailable: 1` with selectors matching their pod template labels.

## Health Probes

| Service      | Type            | Path / Port              | Readiness delay/period | Liveness delay/period             |
| ------------ | --------------- | ------------------------ | ---------------------- | --------------------------------- |
| frontend     | HTTP            | /                        | 3s / 10s               | 5s / 15s                          |
| apigateway   | HTTP            | /                        | 3s / 10s               | 5s / 15s                          |
| authservice  | TCP             | 5050                     | 5s / 10s               | 10s / 15s                         |
| postservice  | TCP             | 5050                     | 5s / 10s               | 10s / 15s                         |
| userservice  | TCP             | 5050                     | 5s / 10s               | 10s / 15s                         |
| imageservice | TCP             | 5050                     | 5s / 10s               | 10s / 15s                         |
| flowservice  | TCP             | 5050                     | 5s / 10s               | 10s / 15s                         |
| database     | exec pg_isready | —                        | 5s / 5s (timeout 3s)   | period 10s, timeout 3s, failure 6 |
| search       | HTTP            | /health                  | 5s / 10s               | 10s / 15s                         |
| broker       | HTTP            | /v1/status/ready on 9644 | startup + readiness    | liveness                          |

database startup probe: failureThreshold=30, periodSeconds=2.
terminationGracePeriodSeconds=60.

## Init Containers

| Deployment | Init image                     | Action                                            |
| ---------- | ------------------------------ | ------------------------------------------------- |
| apigateway | localhost:5000/cogito/database | Runs all pending migrations before gateway starts |

## Networking

| Resource       | Kind    | Host             | Backend       |
| -------------- | ------- | ---------------- | ------------- |
| cogito-ingress | Ingress | cogito.localhost | frontend:8080 |

All inter-service communication uses ClusterIP via Kubernetes DNS
(`service-name:port`). imageservice exposes two ClusterIP ports: 5050 (gRPC) and
8081 (HTTP). NetworkPolicies apply default-deny egress in the `cogito`
namespace, allow DNS to kube-system, and allow explicit in-namespace service
ports.

## Secrets

All secrets live in a single Kubernetes Secret named `cogito-db-secret`:

| Key                        | Consumers                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| database-password          | database (POSTGRES_PASSWORD)                                                    |
| cogito-app-password        | database init script                                                            |
| database-url               | authservice, userservice, postservice, imageservice, flowservice (DATABASE_URL); includes `sslmode=require` |
| internal-grpc-token        | All gRPC services + apigateway (INTERNAL_GRPC_TOKEN)                            |
| session-hmac-secret        | apigateway + authservice (SESSION_HMAC_SECRET)                                  |
| search-master-key          | search (MEILI_MASTER_KEY) + flowservice (MEILI_MASTER_KEY)                      |
| s3-access-key              | storage (config) + imageservice (S3_ACCESS_KEY)                               |
| s3-secret-key              | storage (config) + imageservice (S3_SECRET_KEY)                               |
| s3-provisioning-access-key | storage (config) + imageservice startup (S3_PROVISIONING_ACCESS_KEY)          |
| s3-provisioning-secret-key | storage (config) + imageservice startup (S3_PROVISIONING_SECRET_KEY)          |

Generated by `scripts/deploy.sh` using `openssl rand -hex 32` (or equivalent),
including the PostgreSQL app password. Existing values are not regenerated on
re-runs; missing keys are added in place, and `database-url` is updated only to
require PostgreSQL TLS. SeaweedFS renders its S3 identity config from these
Secret keys into an in-memory pod volume at startup; the rendered config is not
stored in a ConfigMap. The normal S3 identity is limited to image object reads,
writes, listing, and tagging. The separate provisioning identity is used by
imageservice only during startup to create or verify the image bucket.

## Environment Variables

### apigateway

| Var                  | Value                  |
| -------------------- | ---------------------- |
| AUTH_SERVICE_ADDR    | authservice:5050       |
| POST_SERVICE_ADDR    | postservice:5050       |
| USER_SERVICE_ADDR    | userservice:5050       |
| FLOW_SERVICE_ADDR    | flowservice:5050       |
| CACHE_URL            | redis://cache:6379     |
| RATE_LIMIT_FAIL_OPEN | true                   |
| SESSION_HMAC_SECRET  | from secret            |
| INTERNAL_GRPC_TOKEN  | from secret            |

### imageservice

| Var                        | Value                 |
| -------------------------- | --------------------- |
| S3_ENDPOINT                | http://storage:8333 |
| S3_BUCKET                  | cogito-images         |
| S3_REGION                  | us-east-1             |
| S3_ACCESS_KEY              | from secret           |
| S3_SECRET_KEY              | from secret           |
| S3_PROVISIONING_ACCESS_KEY | from secret           |
| S3_PROVISIONING_SECRET_KEY | from secret           |
| HTTP_PORT                  | 8081 (default)        |
| PORT                       | 5050 (default, gRPC)  |

### userservice

| Var                   | Value       |
| --------------------- | ----------- |
| DATABASE_URL          | from secret |
| INTERNAL_GRPC_TOKEN   | from secret |
| ARGON_MAX_CONCURRENCY | 4 (default) |

### flowservice

| Var                 | Value                   |
| ------------------- | ----------------------- |
| DATABASE_URL        | from secret             |
| REDPANDA_BROKERS    | broker:9092             |
| FAN_OUT_THRESHOLD   | 10000                   |
| MEILI_HOST          | http://search:7700      |
| MEILI_MASTER_KEY    | from secret             |
| PORT                | 5050                    |
| INTERNAL_GRPC_TOKEN | from secret             |

### broker/connect

| Var              | Value                   |
| ---------------- | ----------------------- |
| REDPANDA_BROKERS | broker:9092             |
| DATABASE_DSN     | from secret             |
| MEILI_HOST       | http://search:7700      |
| MEILI_MASTER_KEY | from secret             |
| S3_ENDPOINT      | http://storage:8333   |
| S3_BUCKET        | cogito-images           |

PostgreSQL must run with `wal_level=logical` so Redpanda Connect `pg_cdc` can
relay `outbox` inserts. Migration `000010` creates the required `outbox_relay`
publication (`CREATE PUBLICATION outbox_relay FOR TABLE outbox`); the `connect`
deployment will crash-loop until this publication exists.

All services: `DATABASE_URL` (from secret), `INTERNAL_GRPC_TOKEN` (from secret).

### frontend

| Var                | Value                    |
| ------------------ | ------------------------ |
| BACKEND_URL        | http://apigateway:8080   |
| BODY_SIZE_LIMIT    | 2097152                  |
| BACKEND_TIMEOUT_MS | 10000 (default if unset) |

## Storage

| Store       | Service             | Path                               | Purpose                                               |
| ----------- | ------------------- | ---------------------------------- | ----------------------------------------------------- |
| SeaweedFS   | imageservice        | `staging/{filename}`, `{filename}` | Image binaries (S3-compatible, bucket: cogito-images) |
| search      | flowservice         | /data/search                       | Full-text search index (users, posts, hashtags)       |
| database    | all backends        | /var/lib/postgresql/18/docker      | Shared relational data                                |
| cache       | apigateway          | /data                              | Rate limit counters and login throttle (max 200 MB)   |
| broker      | connect/flowservice | /var/lib/redpanda/data             | Kafka-compatible event log                            |

## Migration Strategy

- Migrations in `apps/database/migrations/` as paired `NNNNNN_name.up.sql` /
  `.down.sql`.
- Applied by `apigateway` init container at startup using `migrate/migrate`.
- Applied history is append-only. Deployed schemas are corrected with new
  migrations, never by editing existing ones.
- Mixed-version compatibility required when a schema change affects multiple
  independently deployed services.
- Current: 12 migration pairs (000001 through 000012).

## Deployment Script

`scripts/deploy.sh` is idempotent. Sequence:

1. Verify `kubectl`, `docker`, `make`, and `openssl` are available.
2. Use the current Kubernetes context and create namespace `cogito` (skip if
   exists; override with `NS`).
3. Generate or repair `cogito-db-secret`; create `database-tls` if absent.
4. Build all images via `make IMAGE_PREFIX="$REGISTRY"`.
5. Apply all manifests from `deploy/` and set Cogito images from `REGISTRY`.
6. Scale Deployments down while dependencies restart.
7. Restart the database StatefulSet and wait up to 180 s.
8. Restart stateful services (`cache`, `storage`, `search`, `broker`) and wait.
9. Scale Deployments back to their manifest replica counts and wait.
10. Start port-forward supervisor: `frontend:8080` → `localhost:8080`.
