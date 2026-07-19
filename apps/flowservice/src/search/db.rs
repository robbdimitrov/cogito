use async_trait::async_trait;
use sqlx::{PgPool as DatabasePool, Row};

use crate::cogito::{Hashtag, RecentSearch, User};

pub(crate) const RECENT_SEARCH_LIMIT: i64 = 10;
const MAX_QUERY_CHARS: usize = 255;

#[async_trait]
pub(crate) trait RecentSearchDb: Clone + Send + Sync + 'static {
    async fn list_recent_searches(&self, user_id: i32) -> Result<Vec<RecentSearch>, sqlx::Error>;
    async fn record_recent_search(
        &self,
        user_id: i32,
        entity_type: &str,
        reference: &str,
    ) -> Result<(), sqlx::Error>;
    async fn delete_recent_search(
        &self,
        user_id: i32,
        public_id: &str,
    ) -> Result<bool, sqlx::Error>;
    async fn clear_recent_searches(&self, user_id: i32) -> Result<(), sqlx::Error>;
}

#[async_trait]
impl RecentSearchDb for DatabasePool {
    async fn list_recent_searches(&self, user_id: i32) -> Result<Vec<RecentSearch>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT r.public_id::text, r.entity_type, r.reference, \
               u.id, u.name, u.username, COALESCE(u.bio, ''), \
               COALESCE(u.profile_photo_key, ''), COALESCE(u.cover_photo_key, ''), \
               h.id, h.name, COALESCE(COUNT(ph.post_id), 0)::int \
             FROM recent_searches r \
             LEFT JOIN users u ON u.username = r.reference AND r.entity_type = 'users' \
             LEFT JOIN hashtags h ON h.name = r.reference AND r.entity_type = 'hashtags' \
             LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id \
             WHERE r.user_id = $1 \
               AND (r.entity_type = 'queries' OR u.id IS NOT NULL OR h.id IS NOT NULL) \
             GROUP BY r.id, u.id, h.id \
             ORDER BY r.created DESC, r.id DESC \
             LIMIT $2",
        )
        .bind(user_id)
        .bind(RECENT_SEARCH_LIMIT)
        .fetch_all(self)
        .await?;

        rows.into_iter()
            .map(|row| {
                let id: String = row.try_get(0)?;
                let entity_type: String = row.try_get(1)?;
                let reference: String = row.try_get(2)?;
                let user = if entity_type == "users" {
                    Some(User {
                        id: row.try_get(3)?,
                        name: row.try_get(4)?,
                        username: row.try_get(5)?,
                        bio: row.try_get(6)?,
                        profile_photo_key: row.try_get(7)?,
                        cover_photo_key: row.try_get(8)?,
                        ..Default::default()
                    })
                } else {
                    None
                };
                let hashtag = if entity_type == "hashtags" {
                    Some(Hashtag {
                        id: row.try_get(9)?,
                        name: row.try_get(10)?,
                        post_count: row.try_get(11)?,
                    })
                } else {
                    None
                };
                Ok(RecentSearch {
                    id,
                    r#type: entity_type,
                    reference,
                    user,
                    hashtag,
                })
            })
            .collect()
    }

    async fn record_recent_search(
        &self,
        user_id: i32,
        entity_type: &str,
        reference: &str,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.begin().await?;

        sqlx::query("SELECT id FROM users WHERE id = $1 FOR UPDATE")
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;

        sqlx::query(
            "INSERT INTO recent_searches (user_id, entity_type, reference) \
             VALUES ($1, $2, $3) \
             ON CONFLICT (user_id, entity_type, reference) DO UPDATE SET created = now()",
        )
        .bind(user_id)
        .bind(entity_type)
        .bind(reference)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "DELETE FROM recent_searches \
             WHERE user_id = $1 AND id NOT IN ( \
               SELECT id FROM recent_searches \
               WHERE user_id = $1 \
               ORDER BY created DESC, id DESC \
               LIMIT $2 \
             )",
        )
        .bind(user_id)
        .bind(RECENT_SEARCH_LIMIT)
        .execute(&mut *tx)
        .await?;

        tx.commit().await
    }

    async fn delete_recent_search(
        &self,
        user_id: i32,
        public_id: &str,
    ) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("DELETE FROM recent_searches WHERE public_id = $1::uuid AND user_id = $2")
                .bind(public_id)
                .bind(user_id)
                .execute(self)
                .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn clear_recent_searches(&self, user_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM recent_searches WHERE user_id = $1")
            .bind(user_id)
            .execute(self)
            .await?;
        Ok(())
    }
}

// tonic::Status is used unboxed throughout; boxing only here would just force
// an unbox at the one call site for no stack-size benefit.
#[allow(clippy::result_large_err)]
pub(crate) fn validate_recent_search(
    entity_type: &str,
    reference: &str,
) -> Result<(), tonic::Status> {
    match entity_type {
        "users" if is_valid_username(reference) => Ok(()),
        "hashtags" if is_valid_hashtag(reference) => Ok(()),
        "queries" if is_valid_query(reference) => Ok(()),
        _ => Err(tonic::Status::invalid_argument(
            "Recent search type or reference is invalid.",
        )),
    }
}

pub(crate) fn normalize_recent_reference(entity_type: &str, reference: &str) -> String {
    match entity_type {
        "users" | "hashtags" => reference.to_ascii_lowercase(),
        _ => reference.to_string(),
    }
}

fn is_valid_username(value: &str) -> bool {
    (3..=30).contains(&value.len())
        && value
            .bytes()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == b'_')
}

fn is_valid_hashtag(value: &str) -> bool {
    (1..=50).contains(&value.len())
        && value
            .bytes()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == b'_')
}

fn is_valid_query(value: &str) -> bool {
    !value.is_empty() && value.chars().count() <= MAX_QUERY_CHARS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_recent_search_accepts_expected_shapes() {
        assert!(validate_recent_search("users", "alice_1").is_ok());
        assert!(validate_recent_search("hashtags", "rust").is_ok());
        assert!(validate_recent_search("queries", "rust async").is_ok());
    }

    #[test]
    fn validate_recent_search_rejects_invalid_shapes() {
        assert!(validate_recent_search("users", "ab").is_err());
        assert!(validate_recent_search("hashtags", "bad-tag").is_err());
        assert!(validate_recent_search("queries", "").is_err());
        assert!(validate_recent_search("posts", "rust").is_err());
    }

    #[test]
    fn normalize_recent_reference_lowercases_entities_only() {
        assert_eq!(normalize_recent_reference("users", "Alice_1"), "alice_1");
        assert_eq!(normalize_recent_reference("hashtags", "Rust"), "rust");
        assert_eq!(
            normalize_recent_reference("queries", "Rust Async"),
            "Rust Async"
        );
    }
}
