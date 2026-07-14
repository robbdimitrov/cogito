use rdkafka::Message;
use rdkafka::consumer::Consumer as _;
use sqlx::PgPool as DatabasePool;
use std::sync::Arc;

use crate::consumer_health::ConsumerProgress;
use crate::notifications::db::NotificationDb;

#[derive(serde::Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
enum ActivityEvent {
    Like {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        post_id: i64,
    },
    Unlike {
        actor_id: i32,
        recipient_id: i32,
        post_id: i64,
    },
    Repost {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        post_id: i64,
    },
    Unrepost {
        actor_id: i32,
        recipient_id: i32,
        post_id: i64,
    },
    Reply {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        reply_post_id: i64,
    },
    Unreply {
        reply_post_id: i64,
    },
    Follow {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
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
    reply_post_ids: Option<Vec<i64>>,
}

pub async fn run(
    consumer: rdkafka::consumer::StreamConsumer,
    db: DatabasePool,
    progress: Arc<ConsumerProgress>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    consumer.subscribe(&["activity", "entity-changes"])?;

    // Mark the initial watch value as seen so changed() only fires on a real transition.
    shutdown_rx.borrow_and_update();

    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => break,
            result = consumer.recv() => match result {
                Err(e) => tracing::warn!(error = %e, "broker recv error"),
                Ok(msg) => {
                    let payload = msg.payload().unwrap_or_default();
                    if let Err(e) = dispatch(&db, msg.topic(), payload).await {
                        tracing::warn!(
                            topic = msg.topic(),
                            offset = msg.offset(),
                            error = %e,
                            "notification event failed"
                        );
                        // Continue rather than break — transient errors should not
                        // permanently kill the consumer loop.
                        continue;
                    }
                    consumer
                        .commit_message(&msg, rdkafka::consumer::CommitMode::Async)
                        .ok();
                    progress.mark_committed(msg.partition(), msg.offset());
                }
            }
        }
    }

    Ok(())
}

async fn dispatch(
    db: &DatabasePool,
    topic: &str,
    payload: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match topic {
        "entity-changes" => dispatch_entity_change(db, payload).await,
        "activity" => dispatch_activity(db, payload).await,
        other => {
            tracing::warn!(
                topic = other,
                "notifications consumer skipping unknown topic"
            );
            Ok(())
        }
    }
}

async fn dispatch_entity_change(
    db: &DatabasePool,
    payload: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let event: EntityChangeEvent = match serde_json::from_slice(payload) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!(error = %e, "notifications entity-change event has invalid json");
            return Ok(());
        }
    };

    if event.table != "posts" {
        return Ok(());
    }

    if event.op == "delete" {
        let post_id = match event.id {
            Some(id) => id,
            None => {
                tracing::warn!("notifications entity-change delete event missing id");
                return Ok(());
            }
        };
        db.delete_by_entity(&post_id.to_string(), &["like", "repost"])
            .await?;
        // Reply notifications are keyed by the reply's own entity ID, not the
        // parent's — the parent's FK SET NULL orphans replies rather than
        // deleting them, so those IDs must be captured by the producer.
        for reply_id in event.reply_post_ids.unwrap_or_default() {
            db.delete_by_entity(&reply_id.to_string(), &["reply"])
                .await?;
        }
    } else {
        tracing::warn!(
            op = %event.op,
            table = %event.table,
            "notifications consumer skipping unknown entity op"
        );
    }

    Ok(())
}

async fn dispatch_activity(
    db: &DatabasePool,
    payload: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let event: ActivityEvent = match serde_json::from_slice(payload) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!(error = %e, "notifications activity event has invalid json");
            return Ok(());
        }
    };

    match event {
        ActivityEvent::Like {
            outbox_id,
            actor_id,
            recipient_id,
            post_id,
        } => {
            if actor_id != recipient_id {
                db.insert(
                    outbox_id,
                    recipient_id,
                    actor_id,
                    "like",
                    &post_id.to_string(),
                )
                .await?;
            }
        }
        ActivityEvent::Unlike {
            actor_id,
            recipient_id,
            post_id,
        } => {
            db.delete_by_actor_and_type(actor_id, recipient_id, "like", &post_id.to_string())
                .await?;
        }
        ActivityEvent::Repost {
            outbox_id,
            actor_id,
            recipient_id,
            post_id,
        } => {
            if actor_id != recipient_id {
                db.insert(
                    outbox_id,
                    recipient_id,
                    actor_id,
                    "repost",
                    &post_id.to_string(),
                )
                .await?;
            }
        }
        ActivityEvent::Unrepost {
            actor_id,
            recipient_id,
            post_id,
        } => {
            db.delete_by_actor_and_type(actor_id, recipient_id, "repost", &post_id.to_string())
                .await?;
        }
        ActivityEvent::Reply {
            outbox_id,
            actor_id,
            recipient_id,
            reply_post_id,
        } => {
            if actor_id != recipient_id {
                db.insert(
                    outbox_id,
                    recipient_id,
                    actor_id,
                    "reply",
                    &reply_post_id.to_string(),
                )
                .await?;
            }
        }
        ActivityEvent::Unreply { reply_post_id } => {
            db.delete_by_entity(&reply_post_id.to_string(), &["reply"])
                .await?;
        }
        ActivityEvent::Follow {
            outbox_id,
            actor_id,
            recipient_id,
        } => {
            if actor_id != recipient_id {
                db.insert(
                    outbox_id,
                    recipient_id,
                    actor_id,
                    "follow",
                    &actor_id.to_string(),
                )
                .await?;
            }
        }
        ActivityEvent::Unfollow {
            actor_id,
            recipient_id,
        } => {
            db.delete_by_actor_and_type(actor_id, recipient_id, "follow", &actor_id.to_string())
                .await?;
        }
        ActivityEvent::Unknown => {
            tracing::warn!("unknown activity event, skipping");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entity_change_event_deserializes_without_reply_post_ids() {
        let event: EntityChangeEvent =
            serde_json::from_str(r#"{"table":"posts","op":"delete","id":42}"#).unwrap();
        assert_eq!(event.id, Some(42));
        assert!(event.reply_post_ids.is_none());
    }

    #[test]
    fn entity_change_event_deserializes_with_reply_post_ids() {
        let event: EntityChangeEvent = serde_json::from_str(
            r#"{"table":"posts","op":"delete","id":42,"reply_post_ids":[7,8]}"#,
        )
        .unwrap();
        assert_eq!(event.reply_post_ids, Some(vec![7, 8]));
    }
}
