use crate::controller::{UpdateUserFields, UserDb};
use crate::pagination;
use crate::thoughts::User;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Error as SqlxError, PgPool, Row};

#[derive(Debug, Clone)]
pub struct DbClient {
    pub pool: PgPool,
}

impl DbClient {
    pub async fn new(db_url: &str) -> Result<Self, SqlxError> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl UserDb for DbClient {
    async fn create_user(
        &self,
        name: &str,
        username: &str,
        email: &str,
        password_hash: &str,
    ) -> Result<i32, SqlxError> {
        let mut tx = self.pool.begin().await?;

        let (id,): (i32,) = sqlx::query_as(
            "INSERT INTO users (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(name)
        .bind(username)
        .bind(email)
        .bind(password_hash)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query("INSERT INTO search_outbox (entity_type, entity_id) VALUES ('user', $1)")
            .bind(id.to_string())
            .execute(&mut *tx)
            .await?;

        sqlx::query("SELECT pg_notify('search_outbox', '')")
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(id)
    }

    async fn get_user_with_id(&self, user_id: i32) -> Result<Option<(i32, String)>, SqlxError> {
        let row =
            sqlx::query_as::<_, (i32, String)>("SELECT id, password FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_optional(&self.pool)
                .await?;

        Ok(row)
    }

    async fn get_user(
        &self,
        user_id: i32,
        current_user_id: i32,
    ) -> Result<Option<User>, SqlxError> {
        let row = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                created
                FROM users WHERE id = $2"#
        )
        .bind(current_user_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| User {
            id: r.get("id"),
            name: r.get("name"),
            username: r.get("username"),
            email: r.get("email"),
            bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
            posts: r.get::<'_, Option<i32>, _>("posts").unwrap_or(0),
            likes: r.get::<'_, Option<i32>, _>("likes").unwrap_or(0),
            following: r.get::<'_, Option<i32>, _>("following").unwrap_or(0),
            followers: r.get::<'_, Option<i32>, _>("followers").unwrap_or(0),
            followed: r.get::<'_, Option<bool>, _>("followed").unwrap_or(false),
            created: r
                .get::<'_, Option<DateTime<Utc>>, _>("created")
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                .unwrap_or_default(),
            profile_photo_key: r
                .get::<'_, Option<String>, _>("profile_photo_key")
                .unwrap_or_default(),
            cover_photo_key: r
                .get::<'_, Option<String>, _>("cover_photo_key")
                .unwrap_or_default(),
        }))
    }

    async fn get_user_by_username(
        &self,
        username: &str,
        current_user_id: i32,
    ) -> Result<Option<User>, SqlxError> {
        let row = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                created
                FROM users WHERE username = $2"#
        )
        .bind(current_user_id)
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| User {
            id: r.get("id"),
            name: r.get("name"),
            username: r.get("username"),
            email: r.get("email"),
            bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
            posts: r.get::<'_, Option<i32>, _>("posts").unwrap_or(0),
            likes: r.get::<'_, Option<i32>, _>("likes").unwrap_or(0),
            following: r.get::<'_, Option<i32>, _>("following").unwrap_or(0),
            followers: r.get::<'_, Option<i32>, _>("followers").unwrap_or(0),
            followed: r.get::<'_, Option<bool>, _>("followed").unwrap_or(false),
            created: r
                .get::<'_, Option<DateTime<Utc>>, _>("created")
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                .unwrap_or_default(),
            profile_photo_key: r
                .get::<'_, Option<String>, _>("profile_photo_key")
                .unwrap_or_default(),
            cover_photo_key: r
                .get::<'_, Option<String>, _>("cover_photo_key")
                .unwrap_or_default(),
        }))
    }

    async fn get_users_by_ids(&self, ids: &[i32]) -> Result<Vec<User>, SqlxError> {
        // Lightweight author projection for embedding in post lists: no count
        // subqueries, no email, no per-viewer `followed` flag.
        let rows = sqlx::query(
            r#"SELECT id, name, username, bio, profile_photo_key, cover_photo_key, created
                FROM users WHERE id = ANY($1)"#,
        )
        .bind(ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| User {
                id: r.get("id"),
                name: r.get("name"),
                username: r.get("username"),
                email: String::new(),
                bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
                posts: 0,
                likes: 0,
                following: 0,
                followers: 0,
                followed: false,
                created: r
                    .get::<'_, Option<DateTime<Utc>>, _>("created")
                    .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                    .unwrap_or_default(),
                profile_photo_key: r
                    .get::<'_, Option<String>, _>("profile_photo_key")
                    .unwrap_or_default(),
                cover_photo_key: r
                    .get::<'_, Option<String>, _>("cover_photo_key")
                    .unwrap_or_default(),
            })
            .collect())
    }

    async fn update_user(
        &self,
        user_id: i32,
        fields: UpdateUserFields<'_>,
    ) -> Result<(), SqlxError> {
        let mut tx = self.pool.begin().await?;

        sqlx::query(
            "UPDATE users SET name = $1, username = $2, email = $3, bio = $4, profile_photo_key = COALESCE($5, profile_photo_key), cover_photo_key = COALESCE($6, cover_photo_key) WHERE id = $7",
        )
        .bind(fields.name)
        .bind(fields.username)
        .bind(fields.email)
        .bind(fields.bio)
        .bind(fields.profile_photo_key)
        .bind(fields.cover_photo_key)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query("INSERT INTO search_outbox (entity_type, entity_id) VALUES ('user', $1)")
            .bind(user_id.to_string())
            .execute(&mut *tx)
            .await?;

        sqlx::query("SELECT pg_notify('search_outbox', '')")
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn update_password(&self, user_id: i32, password_hash: &str) -> Result<(), SqlxError> {
        sqlx::query("UPDATE users SET password = $1 WHERE id = $2")
            .bind(password_hash)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn get_following(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError> {
        let cur = pagination::decode_cursor(cursor);
        let cur_ts: Option<DateTime<Utc>> = cur.as_ref().map(|c| c.created);
        let cur_id: Option<i32> = cur.as_ref().map(|c| c.id);
        let rows = sqlx::query(
            r#"SELECT followers.created AS cursor_ts,
                users.id, users.name, users.username, users.email, users.bio, users.profile_photo_key, users.cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                users.created
                FROM users
                INNER JOIN followers ON followers.user_id = users.id
                WHERE followers.follower_id = $2
                AND ($3::timestamptz IS NULL OR (followers.created, users.id) < ($3::timestamptz, $4::int))
                ORDER BY followers.created DESC
                LIMIT $5"#
        )
        .bind(current_user_id)
        .bind(user_id)
        .bind(cur_ts)
        .bind(cur_id)
        .bind(limit as i64 + 1)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let cursor_ts = r
                    .get::<'_, Option<DateTime<Utc>>, _>("cursor_ts")
                    .unwrap_or_default();
                let user = User {
                    id: r.get("id"),
                    name: r.get("name"),
                    username: r.get("username"),
                    email: r.get("email"),
                    bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
                    posts: r.get::<'_, Option<i32>, _>("posts").unwrap_or(0),
                    likes: r.get::<'_, Option<i32>, _>("likes").unwrap_or(0),
                    following: r.get::<'_, Option<i32>, _>("following").unwrap_or(0),
                    followers: r.get::<'_, Option<i32>, _>("followers").unwrap_or(0),
                    followed: r.get::<'_, Option<bool>, _>("followed").unwrap_or(false),
                    created: r
                        .get::<'_, Option<String>, _>("created")
                        .unwrap_or_default(),
                    profile_photo_key: r
                        .get::<'_, Option<String>, _>("profile_photo_key")
                        .unwrap_or_default(),
                    cover_photo_key: r
                        .get::<'_, Option<String>, _>("cover_photo_key")
                        .unwrap_or_default(),
                };
                (user, cursor_ts)
            })
            .collect())
    }

    async fn get_followers(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError> {
        let cur = pagination::decode_cursor(cursor);
        let cur_ts: Option<DateTime<Utc>> = cur.as_ref().map(|c| c.created);
        let cur_id: Option<i32> = cur.as_ref().map(|c| c.id);
        let rows = sqlx::query(
            r#"SELECT followers.created AS cursor_ts,
                users.id, users.name, users.username, users.email, users.bio, users.profile_photo_key, users.cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                users.created
                FROM users
                INNER JOIN followers ON followers.follower_id = users.id
                WHERE followers.user_id = $2
                AND ($3::timestamptz IS NULL OR (followers.created, users.id) < ($3::timestamptz, $4::int))
                ORDER BY followers.created DESC
                LIMIT $5"#
        )
        .bind(current_user_id)
        .bind(user_id)
        .bind(cur_ts)
        .bind(cur_id)
        .bind(limit as i64 + 1)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let cursor_ts = r
                    .get::<'_, Option<DateTime<Utc>>, _>("cursor_ts")
                    .unwrap_or_default();
                let user = User {
                    id: r.get("id"),
                    name: r.get("name"),
                    username: r.get("username"),
                    email: r.get("email"),
                    bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
                    posts: r.get::<'_, Option<i32>, _>("posts").unwrap_or(0),
                    likes: r.get::<'_, Option<i32>, _>("likes").unwrap_or(0),
                    following: r.get::<'_, Option<i32>, _>("following").unwrap_or(0),
                    followers: r.get::<'_, Option<i32>, _>("followers").unwrap_or(0),
                    followed: r.get::<'_, Option<bool>, _>("followed").unwrap_or(false),
                    created: r
                        .get::<'_, Option<String>, _>("created")
                        .unwrap_or_default(),
                    profile_photo_key: r
                        .get::<'_, Option<String>, _>("profile_photo_key")
                        .unwrap_or_default(),
                    cover_photo_key: r
                        .get::<'_, Option<String>, _>("cover_photo_key")
                        .unwrap_or_default(),
                };
                (user, cursor_ts)
            })
            .collect())
    }

    async fn follow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError> {
        sqlx::query(
            "INSERT INTO followers (user_id, follower_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(follower_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn unfollow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError> {
        sqlx::query("DELETE FROM followers WHERE user_id = $1 AND follower_id = $2")
            .bind(user_id)
            .bind(follower_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn search_users(
        &self,
        query: &str,
        limit: i32,
        _current_user_id: i32,
    ) -> Result<Vec<User>, SqlxError> {
        // Lowercase here so the predicate can hit the lower(username) index.
        let escaped = query
            .to_lowercase()
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let pattern = format!("{}%", escaped);
        let rows = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                0::int AS posts,
                0::int AS likes,
                0::int AS following,
                0::int AS followers,
                false AS followed,
                created
                FROM users WHERE lower(username) LIKE $1 ESCAPE '\'
                LIMIT $2"#,
        )
        .bind(pattern)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| User {
                id: r.get("id"),
                name: r.get("name"),
                username: r.get("username"),
                email: r.get("email"),
                bio: r.get::<'_, Option<String>, _>("bio").unwrap_or_default(),
                posts: r.get::<'_, Option<i32>, _>("posts").unwrap_or(0),
                likes: r.get::<'_, Option<i32>, _>("likes").unwrap_or(0),
                following: r.get::<'_, Option<i32>, _>("following").unwrap_or(0),
                followers: r.get::<'_, Option<i32>, _>("followers").unwrap_or(0),
                followed: r.get::<'_, Option<bool>, _>("followed").unwrap_or(false),
                created: r
                    .get::<'_, Option<String>, _>("created")
                    .unwrap_or_default(),
                profile_photo_key: r
                    .get::<'_, Option<String>, _>("profile_photo_key")
                    .unwrap_or_default(),
                cover_photo_key: r
                    .get::<'_, Option<String>, _>("cover_photo_key")
                    .unwrap_or_default(),
            })
            .collect())
    }
}
