use sqlx::postgres::PgPool;

#[derive(Clone)]
pub struct Db {
    pub pool: PgPool,
}

impl Db {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    pub async fn insert_upload(&self, filename: &str, user_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO uploads (filename, user_id) VALUES ($1, $2)")
            .bind(filename)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn verify_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM uploads WHERE filename = $1 AND user_id = $2")
            .bind(filename)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
        
        Ok(count > 0)
    }

    pub async fn consume_upload(&self, filename: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM uploads WHERE filename = $1")
            .bind(filename)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
