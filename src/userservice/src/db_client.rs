use crate::thoughts::User;
use async_trait::async_trait;
use sqlx::{PgPool, Error as SqlxError, Row};

#[derive(Debug, Clone)]
pub struct DbClient {
    pub pool: PgPool,
}

impl DbClient {
    pub async fn new(db_url: &str) -> Result<Self, SqlxError> {
        let pool = PgPool::connect(db_url).await?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl crate::controller::UserDb for DbClient {
    async fn create_user(&self, name: &str, username: &str, email: &str, password_hash: &str) -> Result<i32, SqlxError> {
        let row = sqlx::query_as::<_, (i32,)>(
            "INSERT INTO users (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING id"
        )
        .bind(name)
        .bind(username)
        .bind(email)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    async fn get_user_with_id(&self, user_id: i32) -> Result<Option<(i32, String)>, SqlxError> {
        let row = sqlx::query_as::<_, (i32, String)>(
            "SELECT id, password FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(row)
    }

    async fn get_user(&self, user_id: i32, current_user_id: i32) -> Result<Option<User>, SqlxError> {
        let row = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                time_format(created) AS created
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
            created: r.get::<'_, Option<String>, _>("created").unwrap_or_default(),
            profile_photo_key: r.get::<'_, Option<String>, _>("profile_photo_key").unwrap_or_default(),
            cover_photo_key: r.get::<'_, Option<String>, _>("cover_photo_key").unwrap_or_default(),
        }))
    }

    async fn get_user_by_username(&self, username: &str, current_user_id: i32) -> Result<Option<User>, SqlxError> {
        let row = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                time_format(created) AS created
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
            created: r.get::<'_, Option<String>, _>("created").unwrap_or_default(),
            profile_photo_key: r.get::<'_, Option<String>, _>("profile_photo_key").unwrap_or_default(),
            cover_photo_key: r.get::<'_, Option<String>, _>("cover_photo_key").unwrap_or_default(),
        }))
    }

    async fn update_user(&self, user_id: i32, name: &str, username: &str, email: &str, bio: &str, profile_photo_key: Option<&str>, cover_photo_key: Option<&str>) -> Result<(), SqlxError> {
        sqlx::query(
            "UPDATE users SET name = $1, username = $2, email = $3, bio = $4, profile_photo_key = COALESCE($5, profile_photo_key), cover_photo_key = COALESCE($6, cover_photo_key) WHERE id = $7"
        )
        .bind(name)
        .bind(username)
        .bind(email)
        .bind(bio)
        .bind(profile_photo_key)
        .bind(cover_photo_key)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn update_password(&self, user_id: i32, password_hash: &str) -> Result<(), SqlxError> {
        sqlx::query(
            "UPDATE users SET password = $1 WHERE id = $2"
        )
        .bind(password_hash)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn get_following(&self, user_id: i32, page: i32, limit: i32, current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        let offset = page * limit;
        let rows = sqlx::query(
            r#"SELECT users.id, users.name, users.username, users.email, users.bio, users.profile_photo_key, users.cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                time_format(users.created) AS created
                FROM users
                INNER JOIN followers ON followers.user_id = users.id
                WHERE followers.follower_id = $2
                ORDER BY followers.created DESC
                LIMIT $3 OFFSET $4"#
        )
        .bind(current_user_id)
        .bind(user_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| User {
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
            created: r.get::<'_, Option<String>, _>("created").unwrap_or_default(),
            profile_photo_key: r.get::<'_, Option<String>, _>("profile_photo_key").unwrap_or_default(),
            cover_photo_key: r.get::<'_, Option<String>, _>("cover_photo_key").unwrap_or_default(),
        }).collect())
    }

    async fn get_followers(&self, user_id: i32, page: i32, limit: i32, current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        let offset = page * limit;
        let rows = sqlx::query(
            r#"SELECT users.id, users.name, users.username, users.email, users.bio, users.profile_photo_key, users.cover_photo_key,
                (SELECT count(*)::int FROM posts WHERE user_id = users.id) AS posts,
                (SELECT count(*)::int FROM likes WHERE user_id = users.id) AS likes,
                (SELECT count(*)::int FROM followers WHERE follower_id = users.id) AS following,
                (SELECT count(*)::int FROM followers WHERE user_id = users.id) AS followers,
                EXISTS (SELECT 1 FROM followers WHERE user_id = users.id AND follower_id = $1) AS followed,
                time_format(users.created) AS created
                FROM users
                INNER JOIN followers ON followers.follower_id = users.id
                WHERE followers.user_id = $2
                ORDER BY followers.created DESC
                LIMIT $3 OFFSET $4"#
        )
        .bind(current_user_id)
        .bind(user_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| User {
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
            created: r.get::<'_, Option<String>, _>("created").unwrap_or_default(),
            profile_photo_key: r.get::<'_, Option<String>, _>("profile_photo_key").unwrap_or_default(),
            cover_photo_key: r.get::<'_, Option<String>, _>("cover_photo_key").unwrap_or_default(),
        }).collect())
    }

    async fn follow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError> {
        sqlx::query(
            "INSERT INTO followers (user_id, follower_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(user_id)
        .bind(follower_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn unfollow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError> {
        sqlx::query(
            "DELETE FROM followers WHERE user_id = $1 AND follower_id = $2"
        )
        .bind(user_id)
        .bind(follower_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn search_users(&self, query: &str, limit: i32, _current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        let pattern = format!("{}%", query);
        let rows = sqlx::query(
            r#"SELECT id, name, username, email, bio, profile_photo_key, cover_photo_key,
                0::int AS posts,
                0::int AS likes,
                0::int AS following,
                0::int AS followers,
                false AS followed,
                time_format(created) AS created
                FROM users WHERE username ILIKE $1
                LIMIT $2"#
        )
        .bind(pattern)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| User {
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
            created: r.get::<'_, Option<String>, _>("created").unwrap_or_default(),
            profile_photo_key: r.get::<'_, Option<String>, _>("profile_photo_key").unwrap_or_default(),
            cover_photo_key: r.get::<'_, Option<String>, _>("cover_photo_key").unwrap_or_default(),
        }).collect())
    }
}
