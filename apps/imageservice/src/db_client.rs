use async_trait::async_trait;
use sqlx::postgres::PgPool as DatabasePool;
use std::time::Duration;

const DB_MAX_CONNECTIONS: u32 = 5;
const DB_MAX_CONNECTION_LIFETIME: Duration = Duration::from_secs(30 * 60);
const DB_IDLE_TIMEOUT: Duration = Duration::from_secs(5 * 60);

#[async_trait]
pub trait ImageDb: Send + Sync + 'static {
    async fn insert_upload(&self, filename: &str, user_id: i32) -> Result<(), sqlx::Error>;
    async fn verify_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error>;
    async fn consume_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error>;
    async fn delete_upload_metadata(&self, filename: &str) -> Result<(), sqlx::Error>;
}

#[derive(Clone)]
pub struct DbClient {
    pub pool: DatabasePool,
}

impl DbClient {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(DB_MAX_CONNECTIONS)
            .max_lifetime(DB_MAX_CONNECTION_LIFETIME)
            .idle_timeout(DB_IDLE_TIMEOUT)
            .connect(database_url)
            .await?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl ImageDb for DbClient {
    async fn insert_upload(&self, filename: &str, user_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO uploads (filename, user_id) VALUES ($1, $2)")
            .bind(filename)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn verify_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM uploads WHERE filename = $1 AND user_id = $2")
                .bind(filename)
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(count > 0)
    }

    async fn consume_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM uploads WHERE filename = $1 AND user_id = $2")
            .bind(filename)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn delete_upload_metadata(&self, filename: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM uploads WHERE filename = $1")
            .bind(filename)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
