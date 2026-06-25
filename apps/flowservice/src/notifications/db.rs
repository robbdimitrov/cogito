use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct Notification {
    pub id: i64,
    pub external_id: i64,
    pub user_id: i32,
    pub actor_id: i32,
    pub notification_type: String,
    pub entity_id: String,
    pub read: bool,
    pub created: DateTime<Utc>,
}

// Signals a malformed or tampered pagination cursor.
#[derive(Debug)]
pub struct InvalidCursor;

impl std::fmt::Display for InvalidCursor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid cursor")
    }
}

impl std::error::Error for InvalidCursor {}

fn decode_cursor(cursor: &str) -> Result<Option<(DateTime<Utc>, i64)>, InvalidCursor> {
    if cursor.is_empty() {
        return Ok(None);
    }
    let decoded = URL_SAFE_NO_PAD.decode(cursor).map_err(|_| InvalidCursor)?;
    let s = std::str::from_utf8(&decoded).map_err(|_| InvalidCursor)?;
    let (ts_part, id_part) = s.split_once(',').ok_or(InvalidCursor)?;
    let created = ts_part
        .parse::<DateTime<Utc>>()
        .map_err(|_| InvalidCursor)?;
    let id = id_part.parse::<i64>().map_err(|_| InvalidCursor)?;
    Ok(Some((created, id)))
}

fn encode_cursor(created: DateTime<Utc>, id: i64) -> String {
    let raw = format!("{},{}", created.to_rfc3339(), id);
    URL_SAFE_NO_PAD.encode(raw.as_bytes())
}

#[async_trait]
pub trait NotificationDb: Send + Sync + 'static {
    async fn insert(
        &self,
        external_id: i64,
        user_id: i32,
        actor_id: i32,
        notification_type: &str,
        entity_id: &str,
    ) -> Result<(), sqlx::Error>;

    async fn mark_read(&self, id: i64, user_id: i32) -> Result<bool, sqlx::Error>;

    async fn list(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
    ) -> Result<(Vec<Notification>, String), Box<dyn std::error::Error + Send + Sync>>;

    async fn unread_count(&self, user_id: i32) -> Result<i32, sqlx::Error>;

    async fn delete_by_entity(&self, entity_id: &str, types: &[&str]) -> Result<(), sqlx::Error>;

    async fn delete_by_actor_and_type(
        &self,
        actor_id: i32,
        recipient_id: i32,
        notification_type: &str,
        entity_id: &str,
    ) -> Result<(), sqlx::Error>;
}

#[async_trait]
impl NotificationDb for PgPool {
    async fn insert(
        &self,
        external_id: i64,
        user_id: i32,
        actor_id: i32,
        notification_type: &str,
        entity_id: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO notifications (external_id, user_id, actor_id, type, entity_id) \
             VALUES ($1, $2, $3, $4, $5) \
             ON CONFLICT (external_id) DO NOTHING",
        )
        .bind(external_id)
        .bind(user_id)
        .bind(actor_id)
        .bind(notification_type)
        .bind(entity_id)
        .execute(self)
        .await?;
        Ok(())
    }

    async fn mark_read(&self, id: i64, user_id: i32) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2")
                .bind(id)
                .bind(user_id)
                .execute(self)
                .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn list(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
    ) -> Result<(Vec<Notification>, String), Box<dyn std::error::Error + Send + Sync>> {
        let cursor_parts = decode_cursor(cursor)?;

        // Fetch limit+1 to detect whether a next page exists.
        let fetch_limit = limit + 1;

        let rows: Vec<(i64, i64, i32, i32, String, String, bool, DateTime<Utc>)> =
            match cursor_parts {
                None => {
                    sqlx::query_as(
                        "SELECT id, external_id, user_id, actor_id, type, entity_id, read, created \
                         FROM notifications \
                         WHERE user_id = $1 \
                         ORDER BY created DESC, id DESC \
                         LIMIT $2",
                    )
                    .bind(user_id)
                    .bind(fetch_limit)
                    .fetch_all(self)
                    .await?
                }
                Some((cursor_created, cursor_id)) => {
                    sqlx::query_as(
                        "SELECT id, external_id, user_id, actor_id, type, entity_id, read, created \
                         FROM notifications \
                         WHERE user_id = $1 \
                           AND (created, id) < ($2, $3) \
                         ORDER BY created DESC, id DESC \
                         LIMIT $4",
                    )
                    .bind(user_id)
                    .bind(cursor_created)
                    .bind(cursor_id)
                    .bind(fetch_limit)
                    .fetch_all(self)
                    .await?
                }
            };

        let mut items: Vec<Notification> = rows
            .into_iter()
            .map(
                |(
                    id,
                    external_id,
                    user_id,
                    actor_id,
                    notification_type,
                    entity_id,
                    read,
                    created,
                )| {
                    Notification {
                        id,
                        external_id,
                        user_id,
                        actor_id,
                        notification_type,
                        entity_id,
                        read,
                        created,
                    }
                },
            )
            .collect();

        let next_cursor = if items.len() > limit as usize {
            items.truncate(limit as usize);
            let last = items.last().expect("items non-empty after length check");
            encode_cursor(last.created, last.id)
        } else {
            String::new()
        };

        Ok((items, next_cursor))
    }

    async fn unread_count(&self, user_id: i32) -> Result<i32, sqlx::Error> {
        let (count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false",
        )
        .bind(user_id)
        .fetch_one(self)
        .await?;
        Ok(count.min(i32::MAX as i64) as i32)
    }

    async fn delete_by_entity(&self, entity_id: &str, types: &[&str]) -> Result<(), sqlx::Error> {
        let types_vec: Vec<String> = types.iter().map(|s| s.to_string()).collect();
        sqlx::query("DELETE FROM notifications WHERE type = ANY($1) AND entity_id = $2")
            .bind(&types_vec)
            .bind(entity_id)
            .execute(self)
            .await?;
        Ok(())
    }

    async fn delete_by_actor_and_type(
        &self,
        actor_id: i32,
        recipient_id: i32,
        notification_type: &str,
        entity_id: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "DELETE FROM notifications \
             WHERE actor_id = $1 AND user_id = $2 AND type = $3 AND entity_id = $4",
        )
        .bind(actor_id)
        .bind(recipient_id)
        .bind(notification_type)
        .bind(entity_id)
        .execute(self)
        .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cursor_roundtrip() {
        let created = "2026-06-25T10:30:00Z".parse::<DateTime<Utc>>().unwrap();
        let id = 42i64;
        let encoded = encode_cursor(created, id);
        let decoded = decode_cursor(&encoded).unwrap().unwrap();
        assert_eq!(decoded.0, created);
        assert_eq!(decoded.1, id);
    }

    #[test]
    fn test_empty_cursor_returns_none() {
        assert!(decode_cursor("").unwrap().is_none());
    }

    #[test]
    fn test_invalid_cursor_returns_error() {
        assert!(decode_cursor("not-base64!!!").is_err());
        // Valid base64 but missing comma separator
        let bad = URL_SAFE_NO_PAD.encode(b"nodatehere");
        assert!(decode_cursor(&bad).is_err());
    }
}
