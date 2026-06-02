use sqlx::PgPool;
use std::env;

const DEFAULT_SESSION_TTL_DAYS: i32 = 7;

fn session_ttl_days() -> i32 {
    let days: i32 = env::var("SESSION_TTL_DAYS")
        .unwrap_or_else(|_| DEFAULT_SESSION_TTL_DAYS.to_string())
        .parse()
        .unwrap_or(DEFAULT_SESSION_TTL_DAYS);
    std::cmp::max(1, days)
}

#[derive(Debug, Clone)]
pub struct DbClient {
    pub pool: PgPool,
}

impl DbClient {
    pub async fn new(db_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect(db_url).await?;
        Ok(Self { pool })
    }

    pub async fn delete_expired_sessions(&self) -> Result<(), sqlx::Error> {
        let ttl = session_ttl_days();
        sqlx::query(
            "DELETE FROM sessions WHERE created <= now() - ($1 * interval '1 day')"
        )
        .bind(ttl as f64)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

#[tonic::async_trait]
impl crate::controller::AuthDb for DbClient {
    async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error> {
        // Note: query_as avoids needing a compile-time DB connection which breaks Docker builds.
        // If sqlx::query! is strictly required, ensure sqlx-data.json is generated via `cargo sqlx prepare`
        let row = sqlx::query_as::<_, (i32, String)>("SELECT id, password FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    async fn create_session(&self, session_id: &str, user_id: i32) -> Result<crate::thoughts::Session, sqlx::Error> {
        let row = sqlx::query_as::<_, (String, i32, String)>(
            r#"INSERT INTO sessions (id, user_id) VALUES ($1, $2)
               RETURNING id, user_id, time_format(created) as created"#
        )
        .bind(session_id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(crate::thoughts::Session {
            id: row.0,
            user_id: row.1,
            created: row.2,
        })
    }

    async fn get_session(&self, session_id: &str) -> Result<Option<crate::thoughts::Session>, sqlx::Error> {
        self.delete_expired_sessions().await?;
        let ttl = session_ttl_days();
        let row = sqlx::query_as::<_, (String, i32, String)>(
            r#"SELECT id, user_id, time_format(created) as created
               FROM sessions
               WHERE id = $1 AND created > now() - ($2 * interval '1 day')"#
        )
        .bind(session_id)
        .bind(ttl as f64)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| crate::thoughts::Session {
            id: r.0,
            user_id: r.1,
            created: r.2,
        }))
    }

    async fn get_sessions(&self, user_id: i32) -> Result<Vec<crate::thoughts::Session>, sqlx::Error> {
        self.delete_expired_sessions().await?;
        let ttl = session_ttl_days();
        let rows = sqlx::query_as::<_, (String, i32, String)>(
            r#"SELECT id, user_id, time_format(created) as created
               FROM sessions
               WHERE user_id = $1 AND created > now() - ($2 * interval '1 day')
               ORDER BY created DESC"#
        )
        .bind(user_id)
        .bind(ttl as f64)
        .fetch_all(&self.pool)
        .await?;

        let sessions = rows.into_iter().map(|r| crate::thoughts::Session {
            id: r.0,
            user_id: r.1,
            created: r.2,
        }).collect();

        Ok(sessions)
    }

    async fn delete_session(&self, session_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM sessions WHERE id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_ttl_days_default() {
        env::remove_var("SESSION_TTL_DAYS");
        assert_eq!(session_ttl_days(), 7);
    }

    #[test]
    fn test_session_ttl_days_custom() {
        env::set_var("SESSION_TTL_DAYS", "14");
        assert_eq!(session_ttl_days(), 14);
        env::remove_var("SESSION_TTL_DAYS");
    }
}
