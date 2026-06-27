use sqlx::PgPool;
use sqlx::types::chrono::{DateTime, Utc};
use std::env;

const DEFAULT_SESSION_TTL_DAYS: i32 = 7;

fn session_ttl_days() -> i32 {
    parse_session_ttl_days(env::var("SESSION_TTL_DAYS").ok().as_deref())
}

fn parse_session_ttl_days(value: Option<&str>) -> i32 {
    let days = value
        .unwrap_or_default()
        .parse::<i32>()
        .unwrap_or(DEFAULT_SESSION_TTL_DAYS);
    std::cmp::max(1, days)
}

#[derive(Debug, Clone)]
pub struct DbClient {
    pub pool: PgPool,
}

impl DbClient {
    pub async fn new(db_url: &str) -> Result<Self, sqlx::Error> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await?;
        Ok(Self { pool })
    }

    pub async fn delete_expired_sessions(&self) -> Result<(), sqlx::Error> {
        let ttl = session_ttl_days();
        sqlx::query("DELETE FROM sessions WHERE created <= now() - ($1 * interval '1 day')")
            .bind(ttl as i64)
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
        let row =
            sqlx::query_as::<_, (i32, String)>("SELECT id, password FROM users WHERE email = $1")
                .bind(email)
                .fetch_optional(&self.pool)
                .await?;
        Ok(row)
    }

    async fn create_session(
        &self,
        session_id: &str,
        user_id: i32,
        handle: &str,
    ) -> Result<crate::cogito::Session, sqlx::Error> {
        let row = sqlx::query_as::<_, (String, i32, DateTime<Utc>, String)>(
            r#"INSERT INTO sessions (id, user_id, handle) VALUES ($1, $2, $3)
               RETURNING id, user_id, created, handle"#,
        )
        .bind(session_id)
        .bind(user_id)
        .bind(handle)
        .fetch_one(&self.pool)
        .await?;

        Ok(crate::cogito::Session {
            id: row.0,
            user_id: row.1,
            created: row.2.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            handle: row.3,
        })
    }

    async fn get_session(
        &self,
        session_id: &str,
    ) -> Result<Option<crate::cogito::Session>, sqlx::Error> {
        let ttl = session_ttl_days();
        let row = sqlx::query_as::<_, (String, i32, DateTime<Utc>, String)>(
            r#"SELECT id, user_id, created, handle
               FROM sessions
               WHERE id = $1 AND created > now() - ($2 * interval '1 day')"#,
        )
        .bind(session_id)
        .bind(ttl as i64)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| crate::cogito::Session {
            id: r.0,
            user_id: r.1,
            created: r.2.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            handle: r.3,
        }))
    }

    async fn get_sessions(&self, user_id: i32) -> Result<Vec<crate::cogito::Session>, sqlx::Error> {
        let ttl = session_ttl_days();
        let rows = sqlx::query_as::<_, (String, i32, DateTime<Utc>, String)>(
            r#"SELECT id, user_id, created, handle
               FROM sessions
               WHERE user_id = $1 AND created > now() - ($2 * interval '1 day')
               ORDER BY created DESC"#,
        )
        .bind(user_id)
        .bind(ttl as i64)
        .fetch_all(&self.pool)
        .await?;

        let sessions = rows
            .into_iter()
            .map(|r| crate::cogito::Session {
                id: r.0,
                user_id: r.1,
                created: r.2.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                handle: r.3,
            })
            .collect();

        Ok(sessions)
    }

    async fn delete_session_by_id(&self, session_id: &str) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM sessions WHERE id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    async fn delete_session_by_handle(&self, handle: &str) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM sessions WHERE handle = $1")
            .bind(handle)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    async fn update_password_hash(&self, user_id: i32, new_hash: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET password = $1 WHERE id = $2")
            .bind(new_hash)
            .bind(user_id)
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
        assert_eq!(parse_session_ttl_days(None), 7);
    }

    #[test]
    fn test_session_ttl_days_custom() {
        assert_eq!(parse_session_ttl_days(Some("14")), 14);
    }
}
