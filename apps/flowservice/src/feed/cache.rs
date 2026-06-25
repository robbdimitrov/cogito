use fred::prelude::*;

pub struct FollowerCache {
    client: RedisClient,
}

impl FollowerCache {
    pub fn new(client: RedisClient) -> Self {
        Self { client }
    }

    pub async fn get(&self, author_id: i32) -> Option<i32> {
        let key = cache_key(author_id);
        let result: Result<Option<String>, _> = self.client.get(&key).await;
        match result {
            Ok(Some(value)) => match value.parse::<i32>() {
                Ok(count) => Some(count),
                Err(e) => {
                    tracing::warn!(author_id, error = %e, "failed to parse follower count from cache");
                    None
                }
            },
            Ok(None) => None,
            Err(e) => {
                tracing::warn!(author_id, error = %e, "follower count cache read failed");
                None
            }
        }
    }

    pub async fn set(&self, author_id: i32, count: i32) {
        let key = cache_key(author_id);
        let result: Result<(), _> = self
            .client
            .set(
                &key,
                count.to_string(),
                Some(Expiration::EX(300)),
                None,
                false,
            )
            .await;
        if let Err(e) = result {
            tracing::warn!(author_id, error = %e, "follower count cache write failed");
        }
    }
}

fn cache_key(author_id: i32) -> String {
    format!("follower_count:{}", author_id)
}
