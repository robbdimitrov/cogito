use chrono::{DateTime, Utc};
use rdkafka::{
    Message,
    consumer::{CommitMode, Consumer, StreamConsumer},
};
use sqlx::PgPool as DatabasePool;
use std::sync::Arc;
use tokio::time::{Duration, sleep};

const BACKFILL_POST_LIMIT: i32 = 50;
const MAX_FEED_EVENT_ATTEMPTS: usize = 3;
const FEED_EVENT_RETRY_DELAY: Duration = Duration::from_millis(250);

use crate::consumer_health::ConsumerProgress;
use crate::feed::db::{Entry, FanOutSnapshot, FeedDb};

struct FeedMessage<'a> {
    topic: &'a str,
    payload: &'a [u8],
    partition: i32,
    offset: i64,
}

#[derive(serde::Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
enum ActivityEvent {
    Follow {
        actor_id: i32,
        recipient_id: i32,
    },
    Unfollow {
        actor_id: i32,
        recipient_id: i32,
    },
    #[serde(other)]
    Unknown,
}

#[derive(serde::Deserialize)]
struct EntityChangeEvent {
    table: String,
    op: String,
    id: Option<i64>,
    author_id: Option<i32>,
    follower_count: Option<i32>,
    fan_out_disabled: Option<bool>,
    created: Option<String>,
    in_reply_to_id: Option<i32>,
}

pub async fn run(
    consumer: StreamConsumer,
    db: DatabasePool,
    fan_out_threshold: i32,
    progress: Arc<ConsumerProgress>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    consumer.subscribe(&["activity", "entity-changes"])?;

    // Mark the initial watch value as seen so changed() only fires on a real transition.
    shutdown_rx.borrow_and_update();

    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => {
                tracing::info!("feed consumer shutting down");
                return Ok(());
            }
            result = consumer.recv() => {
                let msg = match result {
                    Ok(m) => m,
                    Err(e) => {
                        tracing::warn!(error = %e, "feed consumer receive failed");
                        continue;
                    }
                };

                let feed_msg = FeedMessage {
                    topic: msg.topic(),
                    payload: msg.payload().unwrap_or_default(),
                    partition: msg.partition(),
                    offset: msg.offset(),
                };

                if process_message_with_retries(
                    &feed_msg,
                    &db,
                    fan_out_threshold,
                    FEED_EVENT_RETRY_DELAY,
                )
                .await
                {
                    consumer.commit_message(&msg, CommitMode::Async).ok();
                    progress.mark_committed(msg.partition(), msg.offset());
                }
            }
        }
    }
}

async fn process_message_with_retries(
    msg: &FeedMessage<'_>,
    db: &(impl FeedDb + ?Sized),
    fan_out_threshold: i32,
    retry_delay: Duration,
) -> bool {
    for attempt in 1..=MAX_FEED_EVENT_ATTEMPTS {
        match handle_message(msg.topic, msg.payload, db, fan_out_threshold).await {
            Ok(()) => return true,
            Err(e) if attempt < MAX_FEED_EVENT_ATTEMPTS => {
                tracing::warn!(
                    topic = msg.topic,
                    partition = msg.partition,
                    offset = msg.offset,
                    attempt,
                    max_attempts = MAX_FEED_EVENT_ATTEMPTS,
                    error = %e,
                    "feed event processing failed, retrying before commit"
                );
                sleep(retry_delay).await;
            }
            Err(e) => {
                tracing::error!(
                    topic = msg.topic,
                    partition = msg.partition,
                    offset = msg.offset,
                    attempts = attempt,
                    error = %e,
                    "feed event processing failed after retries, leaving offset uncommitted for redelivery"
                );
                return false;
            }
        }
    }
    false
}

async fn handle_message(
    topic: &str,
    payload: &[u8],
    db: &(impl FeedDb + ?Sized),
    fan_out_threshold: i32,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match topic {
        "entity-changes" => handle_entity_change(payload, db, fan_out_threshold).await,
        "activity" => handle_activity(payload, db).await,
        _ => {
            tracing::warn!(topic, "feed event on unknown topic");
            Ok(())
        }
    }
}

async fn handle_entity_change(
    payload: &[u8],
    db: &(impl FeedDb + ?Sized),
    fan_out_threshold: i32,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let event: EntityChangeEvent = match serde_json::from_slice(payload) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!(error = %e, "feed entity-change event has invalid json");
            return Ok(());
        }
    };

    if event.table != "posts" {
        return Ok(());
    }

    match event.op.as_str() {
        "upsert" => {
            // Skip replies — in_reply_to_id must be absent (null) for top-level posts.
            if event.in_reply_to_id.is_some() {
                return Ok(());
            }
            let post_id = match event.id {
                Some(id) => id as i32,
                None => return Ok(()),
            };
            let author_id = match event.author_id {
                Some(id) => id,
                None => return Ok(()),
            };
            let created = match event.created.as_deref().and_then(parse_created) {
                Some(t) => t,
                None => return Ok(()),
            };
            let snapshot = match (event.follower_count, event.fan_out_disabled) {
                (Some(follower_count), Some(fan_out_disabled)) => FanOutSnapshot {
                    follower_count,
                    fan_out_disabled,
                },
                _ => {
                    tracing::warn!(
                        author_id,
                        post_id,
                        "feed entity-change post upsert missing fan-out snapshot, using legacy database lookup"
                    );
                    db.get_fan_out_snapshot(author_id).await?
                }
            };
            fan_out_post(
                db,
                author_id,
                post_id,
                created,
                snapshot.follower_count,
                snapshot.fan_out_disabled,
                fan_out_threshold,
            )
            .await?;
        }
        "delete" => {
            let post_id = match event.id {
                Some(id) => id as i32,
                None => return Ok(()),
            };
            db.delete_by_post(post_id).await?;
        }
        op => {
            tracing::warn!(op, "feed entity-change event has unknown op");
        }
    }

    Ok(())
}

async fn handle_activity(
    payload: &[u8],
    db: &(impl FeedDb + ?Sized),
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let event: ActivityEvent = match serde_json::from_slice(payload) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!(error = %e, "feed activity event has invalid json");
            return Ok(());
        }
    };

    match event {
        ActivityEvent::Follow {
            actor_id,
            recipient_id,
        } => {
            backfill_follow(db, actor_id, recipient_id).await?;
        }
        ActivityEvent::Unfollow {
            actor_id,
            recipient_id,
        } => {
            db.prune_by_followee(actor_id, recipient_id).await?;
        }
        ActivityEvent::Unknown => {}
    }

    Ok(())
}

async fn fan_out_post(
    db: &(impl FeedDb + ?Sized),
    author_id: i32,
    post_id: i32,
    created: DateTime<Utc>,
    follower_count: i32,
    fan_out_disabled: bool,
    fan_out_threshold: i32,
) -> Result<(), sqlx::Error> {
    if fan_out_disabled || follower_count >= fan_out_threshold {
        db.bulk_insert(&[Entry {
            user_id: author_id,
            post_id,
            created,
        }])
        .await?;
        if !fan_out_disabled {
            db.set_fan_out_disabled(author_id).await?;
        }
    } else {
        let followers = db.get_followers(author_id, fan_out_threshold).await?;
        let entries: Vec<Entry> = followers
            .into_iter()
            .map(|follower_id| Entry {
                user_id: follower_id,
                post_id,
                created,
            })
            .chain(std::iter::once(Entry {
                user_id: author_id,
                post_id,
                created,
            }))
            .collect();
        db.bulk_insert(&entries).await?;
    }

    Ok(())
}

async fn backfill_follow(
    db: &(impl FeedDb + ?Sized),
    follower_id: i32,
    followee_id: i32,
) -> Result<(), sqlx::Error> {
    if db.get_fan_out_disabled(followee_id).await? {
        // High-follower accounts use a pull model: postservice's GetFeed queries their
        // posts directly at read time. No push-backfill is needed or correct here.
        return Ok(());
    }

    let posts = db.get_last_posts(followee_id, BACKFILL_POST_LIMIT).await?;
    let entries: Vec<Entry> = posts
        .into_iter()
        .map(|p| Entry {
            user_id: follower_id,
            post_id: p.post_id,
            created: p.created,
        })
        .collect();
    db.bulk_insert(&entries).await?;

    Ok(())
}

/// Parse a created timestamp string. Tries RFC 3339 (with and without nanoseconds)
/// and the Postgres local-time format used by the outbox ("2006-01-02 15:04:05.999999-07").
fn parse_created(value: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return Some(dt.with_timezone(&Utc));
    }
    // Postgres-style: "2024-01-02 15:04:05.123456+00"
    if let Ok(dt) = DateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f%#z") {
        return Some(dt.with_timezone(&Utc));
    }
    tracing::warn!(value, "failed to parse created timestamp");
    None
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use async_trait::async_trait;

    use super::*;

    #[derive(Default)]
    struct FakeDb {
        followers: Vec<i32>,
        follower_count: i32,
        fan_out_disabled: bool,
        fail_bulk_insert: bool,
        entries: Mutex<Vec<Entry>>,
        latch_sets: Mutex<usize>,
    }

    #[async_trait]
    impl FeedDb for FakeDb {
        async fn bulk_insert(&self, entries: &[Entry]) -> Result<(), sqlx::Error> {
            if self.fail_bulk_insert {
                return Err(sqlx::Error::Protocol(
                    "simulated feed insert failure".into(),
                ));
            }
            self.entries
                .lock()
                .unwrap()
                .extend(entries.iter().map(|e| Entry {
                    user_id: e.user_id,
                    post_id: e.post_id,
                    created: e.created,
                }));
            Ok(())
        }

        async fn prune_by_followee(
            &self,
            _follower_id: i32,
            _followee_id: i32,
        ) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn get_followers(
            &self,
            _author_id: i32,
            _limit: i32,
        ) -> Result<Vec<i32>, sqlx::Error> {
            Ok(self.followers.clone())
        }

        async fn get_last_posts(
            &self,
            _user_id: i32,
            _limit: i32,
        ) -> Result<Vec<Entry>, sqlx::Error> {
            Ok(Vec::new())
        }

        async fn get_fan_out_snapshot(&self, _user_id: i32) -> Result<FanOutSnapshot, sqlx::Error> {
            Ok(FanOutSnapshot {
                follower_count: self.follower_count,
                fan_out_disabled: self.fan_out_disabled,
            })
        }

        async fn get_fan_out_disabled(&self, _user_id: i32) -> Result<bool, sqlx::Error> {
            Ok(self.fan_out_disabled)
        }

        async fn set_fan_out_disabled(&self, _user_id: i32) -> Result<(), sqlx::Error> {
            *self.latch_sets.lock().unwrap() += 1;
            Ok(())
        }

        async fn delete_by_post(&self, _post_id: i32) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn delete_old_feed(&self) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn delete_old_outbox(&self) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn regular_post_uses_payload_follower_count_for_push_fanout() {
        let db = FakeDb {
            followers: vec![11, 12],
            ..Default::default()
        };
        let created = DateTime::parse_from_rfc3339("2026-06-27T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        fan_out_post(&db, 7, 99, created, 2, false, 10)
            .await
            .unwrap();

        let entries = db.entries.lock().unwrap();
        let user_ids: Vec<i32> = entries.iter().map(|e| e.user_id).collect();
        assert_eq!(user_ids, vec![11, 12, 7]);
        assert_eq!(*db.latch_sets.lock().unwrap(), 0);
    }

    #[tokio::test]
    async fn threshold_post_sets_latch_and_only_materializes_author_entry() {
        let db = FakeDb {
            followers: vec![11, 12],
            ..Default::default()
        };
        let created = DateTime::parse_from_rfc3339("2026-06-27T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        fan_out_post(&db, 7, 99, created, 10, false, 10)
            .await
            .unwrap();

        let entries = db.entries.lock().unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].user_id, 7);
        assert_eq!(entries[0].post_id, 99);
        assert_eq!(*db.latch_sets.lock().unwrap(), 1);
    }

    #[tokio::test]
    async fn existing_latch_only_materializes_author_entry_without_rewriting_latch() {
        let db = FakeDb {
            followers: vec![11, 12],
            ..Default::default()
        };
        let created = DateTime::parse_from_rfc3339("2026-06-27T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        fan_out_post(&db, 7, 99, created, 2, true, 10)
            .await
            .unwrap();

        let entries = db.entries.lock().unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].user_id, 7);
        assert_eq!(*db.latch_sets.lock().unwrap(), 0);
    }

    #[tokio::test]
    async fn post_upsert_without_snapshot_uses_legacy_database_lookup() {
        let db = FakeDb {
            followers: vec![11, 12],
            follower_count: 2,
            ..Default::default()
        };
        let payload = br#"{
            "table":"posts",
            "op":"upsert",
            "id":99,
            "author_id":7,
            "created":"2026-06-27T10:00:00Z"
        }"#;

        handle_entity_change(payload, &db, 10).await.unwrap();

        let entries = db.entries.lock().unwrap();
        let user_ids: Vec<i32> = entries.iter().map(|e| e.user_id).collect();
        assert_eq!(user_ids, vec![11, 12, 7]);
        assert_eq!(*db.latch_sets.lock().unwrap(), 0);
    }

    #[tokio::test]
    async fn malformed_event_commits_as_deliberate_skip() {
        let db = FakeDb::default();
        let msg = FeedMessage {
            topic: "activity",
            payload: b"not-json",
            partition: 0,
            offset: 42,
        };

        let should_commit = process_message_with_retries(&msg, &db, 10, Duration::ZERO).await;

        assert!(should_commit);
    }

    #[tokio::test]
    async fn retryable_processing_failure_stays_uncommitted() {
        let db = FakeDb {
            followers: vec![11],
            fail_bulk_insert: true,
            ..Default::default()
        };
        let msg = FeedMessage {
            topic: "entity-changes",
            payload: br#"{
                "table":"posts",
                "op":"upsert",
                "id":99,
                "author_id":7,
                "follower_count":1,
                "fan_out_disabled":false,
                "created":"2026-06-27T10:00:00Z"
            }"#,
            partition: 0,
            offset: 43,
        };

        let should_commit = process_message_with_retries(&msg, &db, 10, Duration::ZERO).await;

        assert!(!should_commit);
    }
}
