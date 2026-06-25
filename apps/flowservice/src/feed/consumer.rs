use chrono::{DateTime, Utc};
use rdkafka::{
    Message,
    consumer::{CommitMode, Consumer, StreamConsumer},
};

const BACKFILL_POST_LIMIT: i32 = 50;

use crate::feed::{
    cache::FollowerCache,
    db::{Entry, FeedDb},
};

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
    id: Option<i32>,
    author_id: Option<i32>,
    created: Option<String>,
    in_reply_to_id: Option<i32>,
}

pub async fn run(
    consumer: StreamConsumer,
    db: sqlx::PgPool,
    cache: FollowerCache,
    fan_out_threshold: i32,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
    consumer
        .subscribe(&["activity", "entity-changes"])
        .expect("kafka topic subscription failed");

    // Mark the initial watch value as seen so changed() only fires on a real transition.
    shutdown_rx.borrow_and_update();

    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => {
                tracing::info!("feed consumer shutting down");
                return;
            }
            result = consumer.recv() => {
                let msg = match result {
                    Ok(m) => m,
                    Err(e) => {
                        tracing::warn!(error = %e, "feed consumer receive failed");
                        continue;
                    }
                };

                let topic = msg.topic();
                let payload = msg.payload().unwrap_or_default();

                match handle_message(topic, payload, &db, &cache, fan_out_threshold).await {
                    Ok(()) => {
                        consumer.commit_message(&msg, CommitMode::Async).ok();
                    }
                    Err(e) => {
                        tracing::warn!(
                            topic,
                            partition = msg.partition(),
                            offset = msg.offset(),
                            error = %e,
                            "feed event processing failed"
                        );
                        // No commit — let the message be redelivered on next start.
                    }
                }
            }
        }
    }
}

async fn handle_message(
    topic: &str,
    payload: &[u8],
    db: &sqlx::PgPool,
    cache: &FollowerCache,
    fan_out_threshold: i32,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match topic {
        "entity-changes" => handle_entity_change(payload, db, cache, fan_out_threshold).await,
        "activity" => handle_activity(payload, db).await,
        _ => {
            tracing::warn!(topic, "feed event on unknown topic");
            Ok(())
        }
    }
}

async fn handle_entity_change(
    payload: &[u8],
    db: &sqlx::PgPool,
    cache: &FollowerCache,
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
                Some(id) => id,
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
            fan_out_post(db, cache, author_id, post_id, created, fan_out_threshold).await?;
        }
        "delete" => {}
        op => {
            tracing::warn!(op, "feed entity-change event has unknown op");
        }
    }

    Ok(())
}

async fn handle_activity(
    payload: &[u8],
    db: &sqlx::PgPool,
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
            if let Err(e) = db.prune_by_followee(actor_id, recipient_id).await {
                tracing::warn!(
                    actor_id,
                    recipient_id,
                    error = %e,
                    "feed prune by followee failed"
                );
            }
        }
        ActivityEvent::Unknown => {}
    }

    Ok(())
}

async fn fan_out_post(
    db: &sqlx::PgPool,
    cache: &FollowerCache,
    author_id: i32,
    post_id: i32,
    created: DateTime<Utc>,
    fan_out_threshold: i32,
) -> Result<(), sqlx::Error> {
    let count = match cache.get(author_id).await {
        Some(c) => c,
        None => {
            let c = db.count_followers(author_id).await?;
            cache.set(author_id, c).await;
            c
        }
    };

    if count >= fan_out_threshold {
        db.bulk_insert(&[Entry {
            user_id: author_id,
            post_id,
            created,
        }])
        .await?;
        // Guard the UPDATE — set_fan_out_disabled is idempotent but the write is
        // wasted on every post once the flag is already set.
        if !db.get_fan_out_disabled(author_id).await? {
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
    db: &sqlx::PgPool,
    follower_id: i32,
    followee_id: i32,
) -> Result<(), sqlx::Error> {
    if db.get_fan_out_disabled(followee_id).await? {
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
