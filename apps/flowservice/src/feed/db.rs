use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

const BULK_INSERT_BATCH_SIZE: usize = 1000;

pub struct Entry {
    pub user_id: i32,
    pub post_id: i32,
    pub created: DateTime<Utc>,
}

#[async_trait]
pub trait FeedDb: Send + Sync + 'static {
    async fn bulk_insert(&self, entries: &[Entry]) -> Result<(), sqlx::Error>;
    async fn prune_by_followee(
        &self,
        follower_id: i32,
        followee_id: i32,
    ) -> Result<(), sqlx::Error>;
    async fn count_followers(&self, author_id: i32) -> Result<i32, sqlx::Error>;
    async fn get_followers(&self, author_id: i32, limit: i32) -> Result<Vec<i32>, sqlx::Error>;
    async fn get_last_posts(&self, user_id: i32, limit: i32) -> Result<Vec<Entry>, sqlx::Error>;
    async fn get_fan_out_disabled(&self, user_id: i32) -> Result<bool, sqlx::Error>;
    async fn set_fan_out_disabled(&self, user_id: i32) -> Result<(), sqlx::Error>;
    async fn delete_by_post(&self, post_id: i32) -> Result<(), sqlx::Error>;
    async fn delete_old_feed(&self) -> Result<(), sqlx::Error>;
    async fn delete_old_outbox(&self) -> Result<(), sqlx::Error>;
}

#[async_trait]
impl FeedDb for PgPool {
    async fn bulk_insert(&self, entries: &[Entry]) -> Result<(), sqlx::Error> {
        if entries.is_empty() {
            return Ok(());
        }
        for chunk in entries.chunks(BULK_INSERT_BATCH_SIZE) {
            let user_ids: Vec<i32> = chunk.iter().map(|e| e.user_id).collect();
            let post_ids: Vec<i32> = chunk.iter().map(|e| e.post_id).collect();
            let created: Vec<DateTime<Utc>> = chunk.iter().map(|e| e.created).collect();
            sqlx::query(
                r#"INSERT INTO feed (user_id, post_id, created)
                   SELECT * FROM UNNEST($1::int4[], $2::int4[], $3::timestamptz[])
                   ON CONFLICT (user_id, post_id) DO NOTHING"#,
            )
            .bind(&user_ids)
            .bind(&post_ids)
            .bind(&created)
            .execute(self)
            .await?;
        }
        Ok(())
    }

    async fn prune_by_followee(
        &self,
        follower_id: i32,
        followee_id: i32,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"DELETE FROM feed f USING posts p
               WHERE f.post_id = p.id
                 AND f.user_id = $1
                 AND p.user_id = $2"#,
        )
        .bind(follower_id)
        .bind(followee_id)
        .execute(self)
        .await?;
        Ok(())
    }

    async fn count_followers(&self, author_id: i32) -> Result<i32, sqlx::Error> {
        let row = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM followers WHERE user_id = $1")
            .bind(author_id)
            .fetch_one(self)
            .await?;
        Ok(row.0.min(i32::MAX as i64) as i32)
    }

    async fn get_followers(&self, author_id: i32, limit: i32) -> Result<Vec<i32>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (i32,)>(
            "SELECT follower_id FROM followers WHERE user_id = $1 LIMIT $2",
        )
        .bind(author_id)
        .bind(limit)
        .fetch_all(self)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    async fn get_last_posts(&self, user_id: i32, limit: i32) -> Result<Vec<Entry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (i32, DateTime<Utc>)>(
            r#"SELECT id, created FROM posts
               WHERE user_id = $1 AND in_reply_to_id IS NULL
               ORDER BY created DESC, id DESC
               LIMIT $2"#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(self)
        .await?;
        Ok(rows
            .into_iter()
            .map(|(post_id, created)| Entry {
                user_id,
                post_id,
                created,
            })
            .collect())
    }

    async fn get_fan_out_disabled(&self, user_id: i32) -> Result<bool, sqlx::Error> {
        let row = sqlx::query_as::<_, (bool,)>("SELECT fan_out_disabled FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(self)
            .await?;
        // Treat a missing user (deleted between event emit and processing) as not disabled.
        Ok(row.map(|r| r.0).unwrap_or(false))
    }

    async fn set_fan_out_disabled(&self, user_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET fan_out_disabled = true WHERE id = $1")
            .bind(user_id)
            .execute(self)
            .await?;
        Ok(())
    }

    async fn delete_by_post(&self, post_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM feed WHERE post_id = $1")
            .bind(post_id)
            .execute(self)
            .await?;
        Ok(())
    }

    async fn delete_old_feed(&self) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM feed WHERE created < now() - interval '30 days'")
            .execute(self)
            .await?;
        Ok(())
    }

    async fn delete_old_outbox(&self) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM outbox WHERE created < now() - interval '7 days'")
            .execute(self)
            .await?;
        Ok(())
    }
}
