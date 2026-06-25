# Flow Service Instructions

These rules extend the repository-level `AGENTS.md` for `apps/flowservice/`.

- This service is the sole consumer of the `activity` and `entity-changes` Kafka topics
  for notifications and feed fan-out. Do not add a second consumer group for those
  topics without accounting for partition ownership.
- Kafka consumers use at-least-once delivery. Every handler called from the consumer
  loop must be idempotent. Confirm before adding new write paths.
- The Meilisearch client is read-only (search queries only). Index writes are handled
  by Redpanda Connect pipelines. Do not add document upsert/delete calls here without
  explicitly deciding to take over that responsibility.
- The scoped Meilisearch API key is provisioned once at startup with UID
  `flowservice-scoped-key`. It grants only `search` and `indexes.get` actions.
