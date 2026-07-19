use rdkafka::Message;
use rdkafka::consumer::Consumer as _;
use sqlx::PgPool as DatabasePool;
use std::sync::Arc;

use crate::consumer_health::ConsumerProgress;
use crate::notifications::db::NotificationDb;

// post_id/reply_post_id stay in the outbox payload contract but are unused
// here now that entity_id lookups key on the public id instead.
#[derive(serde::Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
enum ActivityEvent {
    Like {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        #[allow(dead_code)]
        post_id: i64,
        post_public_id: String,
    },
    Unlike {
        actor_id: i32,
        recipient_id: i32,
        #[allow(dead_code)]
        post_id: i64,
        post_public_id: String,
    },
    Repost {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        #[allow(dead_code)]
        post_id: i64,
        post_public_id: String,
    },
    Unrepost {
        actor_id: i32,
        recipient_id: i32,
        #[allow(dead_code)]
        post_id: i64,
        post_public_id: String,
    },
    Reply {
        #[serde(rename = "_outbox_id")]
        outbox_id: i64,
        actor_id: i32,
        recipient_id: i32,
        #[allow(dead_code)]
        reply_post_id: i64,
        reply_post_public_id: String,
    },
    Unreply {
        #[allow(dead_code)]
        reply_post_id: i64,
        reply_post_public_id: String,
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
    // id/reply_post_ids stay in the payload contract but are unused here
    // now that cleanup keys on the public id instead.
    #[allow(dead_code)]
    id: Option<i64>,
    public_id: Option<String>,
    #[allow(dead_code)]
    reply_post_ids: Option<Vec<i64>>,
    reply_post_public_ids: Option<Vec<String>>,
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
        let public_id = match event.public_id {
            Some(id) => id,
            None => {
                tracing::warn!("notifications entity-change delete event missing public_id");
                return Ok(());
            }
        };
        db.delete_by_entity(&public_id, &["like", "repost"]).await?;
        // Reply notifications are keyed by the reply's own entity ID; the
        // parent's FK SET NULL orphans them instead of deleting them.
        for reply_public_id in event.reply_post_public_ids.unwrap_or_default() {
            db.delete_by_entity(&reply_public_id, &["reply"]).await?;
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
            post_id: _,
            post_public_id,
        } => {
            if actor_id != recipient_id {
                db.insert(outbox_id, recipient_id, actor_id, "like", &post_public_id)
                    .await?;
            }
        }
        ActivityEvent::Unlike {
            actor_id,
            recipient_id,
            post_id: _,
            post_public_id,
        } => {
            db.delete_by_actor_and_type(actor_id, recipient_id, "like", &post_public_id)
                .await?;
        }
        ActivityEvent::Repost {
            outbox_id,
            actor_id,
            recipient_id,
            post_id: _,
            post_public_id,
        } => {
            if actor_id != recipient_id {
                db.insert(outbox_id, recipient_id, actor_id, "repost", &post_public_id)
                    .await?;
            }
        }
        ActivityEvent::Unrepost {
            actor_id,
            recipient_id,
            post_id: _,
            post_public_id,
        } => {
            db.delete_by_actor_and_type(actor_id, recipient_id, "repost", &post_public_id)
                .await?;
        }
        ActivityEvent::Reply {
            outbox_id,
            actor_id,
            recipient_id,
            reply_post_id: _,
            reply_post_public_id,
        } => {
            if actor_id != recipient_id {
                db.insert(
                    outbox_id,
                    recipient_id,
                    actor_id,
                    "reply",
                    &reply_post_public_id,
                )
                .await?;
            }
        }
        ActivityEvent::Unreply {
            reply_post_id: _,
            reply_post_public_id,
        } => {
            db.delete_by_entity(&reply_post_public_id, &["reply"])
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
        assert!(event.public_id.is_none());
        assert!(event.reply_post_public_ids.is_none());
    }

    #[test]
    fn entity_change_event_deserializes_with_reply_post_ids() {
        let event: EntityChangeEvent = serde_json::from_str(
            r#"{"table":"posts","op":"delete","id":42,"public_id":"11111111-1111-1111-1111-111111111111","reply_post_ids":[7,8],"reply_post_public_ids":["22222222-2222-2222-2222-222222222222","33333333-3333-3333-3333-333333333333"]}"#,
        )
        .unwrap();
        assert_eq!(event.reply_post_ids, Some(vec![7, 8]));
        assert_eq!(
            event.public_id,
            Some("11111111-1111-1111-1111-111111111111".to_string())
        );
        assert_eq!(
            event.reply_post_public_ids,
            Some(vec![
                "22222222-2222-2222-2222-222222222222".to_string(),
                "33333333-3333-3333-3333-333333333333".to_string(),
            ])
        );
    }
}
