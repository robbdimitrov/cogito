// Meilisearch index writes are handled by Redpanda Connect pipelines; this
// client is read-only (search and indexes.get only).

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use meilisearch_sdk::{
    client::Client,
    key::{Action, KeyBuilder},
    search::SearchQuery,
};
use serde::{Deserialize, Serialize};

const SCOPED_KEY_UID: &str = "flowservice-scoped-key";
const MAX_OFFSET: u32 = 1000;

#[derive(Deserialize)]
pub(crate) struct UserHit {
    pub id: i32,
    pub username: String,
    pub name: String,
}

#[derive(Deserialize)]
pub(crate) struct PostHit {
    pub id: i32,
    pub content: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub(crate) struct HashtagHit {
    pub id: i32,
    pub name: String,
    pub post_count: i32,
}

#[derive(Clone)]
pub(crate) struct MeiliClient {
    client: Client,
}

impl MeiliClient {
    /// Connect with `master_key`, provision a scoped API key (idempotent), ensure
    /// the three indexes exist with correct attribute settings, then return a client
    /// configured with the scoped key. The master key is not retained.
    pub(crate) async fn new(
        host: &str,
        master_key: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let master = Client::new(host, Some(master_key))?;

        let scoped_key = provision_scoped_key(&master).await?;
        ensure_indexes(&master).await?;

        let client = Client::new(host, Some(scoped_key.as_str()))?;
        Ok(Self { client })
    }

    pub(crate) async fn search_users(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<UserHit>, Box<dyn std::error::Error + Send + Sync>> {
        let idx = self.client.index("users");
        let mut sq = SearchQuery::new(&idx);
        sq.with_query(query)
            .with_limit(limit as usize)
            .with_offset(offset as usize);
        let results = sq.execute::<UserHit>().await?;
        Ok(results.hits.into_iter().map(|h| h.result).collect())
    }

    pub(crate) async fn search_posts(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PostHit>, Box<dyn std::error::Error + Send + Sync>> {
        let idx = self.client.index("posts");
        let mut sq = SearchQuery::new(&idx);
        sq.with_query(query)
            .with_limit(limit as usize)
            .with_offset(offset as usize);
        let results = sq.execute::<PostHit>().await?;
        Ok(results.hits.into_iter().map(|h| h.result).collect())
    }

    pub(crate) async fn search_hashtags(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<HashtagHit>, Box<dyn std::error::Error + Send + Sync>> {
        let idx = self.client.index("hashtags");
        let mut sq = SearchQuery::new(&idx);
        sq.with_query(query)
            .with_limit(limit as usize)
            .with_offset(offset as usize);
        let results = sq.execute::<HashtagHit>().await?;
        Ok(results.hits.into_iter().map(|h| h.result).collect())
    }
}

async fn provision_scoped_key(master: &Client) -> Result<String, Box<dyn std::error::Error>> {
    // Meilisearch REST API v1 GET /keys/{keyOrUid} accepts both the key token and the UID,
    // so a direct lookup by UID is idempotent and avoids pagination edge-cases from get_keys().
    if let Ok(key) = master.get_key(SCOPED_KEY_UID).await {
        return Ok(key.key);
    }

    let mut builder = KeyBuilder::new();
    builder
        .with_uid(SCOPED_KEY_UID)
        .with_description("flowservice operational key")
        .with_actions([Action::Search, Action::IndexesGet])
        .with_indexes(["users", "posts", "hashtags"]);

    let key = master.create_key(&builder).await?;
    Ok(key.key)
}

async fn ensure_indexes(master: &Client) -> Result<(), Box<dyn std::error::Error>> {
    struct IndexDef {
        uid: &'static str,
        searchable: &'static [&'static str],
        filterable: &'static [&'static str],
        sortable: &'static [&'static str],
    }

    const DEFS: &[IndexDef] = &[
        IndexDef {
            uid: "users",
            searchable: &["username", "name"],
            filterable: &[],
            sortable: &[],
        },
        IndexDef {
            uid: "posts",
            searchable: &["content", "username"],
            filterable: &["hashtags"],
            sortable: &["created_at"],
        },
        IndexDef {
            uid: "hashtags",
            searchable: &["name"],
            filterable: &[],
            sortable: &["post_count"],
        },
    ];

    for def in DEFS {
        let is_new = master.get_index(def.uid).await.is_err();
        if is_new {
            let task_info = master.create_index(def.uid, Some("id")).await?;
            master.wait_for_task(task_info, None, None).await?;
            tracing::info!(index = def.uid, "created meilisearch index");

            // Only configure attributes on new indexes. Re-applying on every startup
            // triggers a full Meilisearch re-index and can block search availability.
            // Apply attribute changes via a migration task on existing indexes instead.
            let idx = master.index(def.uid);
            if !def.searchable.is_empty() {
                let task = idx.set_searchable_attributes(def.searchable).await?;
                master.wait_for_task(task, None, None).await?;
            }
            if !def.filterable.is_empty() {
                let task = idx.set_filterable_attributes(def.filterable).await?;
                master.wait_for_task(task, None, None).await?;
            }
            if !def.sortable.is_empty() {
                let task = idx.set_sortable_attributes(def.sortable).await?;
                master.wait_for_task(task, None, None).await?;
            }
        }
    }

    Ok(())
}

// --- Cursor encoding / decoding ---

#[derive(Serialize, Deserialize)]
struct CursorPayload {
    offset: u32,
}

/// Decode a base64url cursor into a page offset.
/// Returns 0 for an empty or malformed cursor; clamps to [0, MAX_OFFSET].
pub(crate) fn decode_cursor(cursor: &str) -> u32 {
    if cursor.is_empty() {
        return 0;
    }
    let bytes = match URL_SAFE_NO_PAD.decode(cursor) {
        Ok(b) => b,
        Err(_) => return 0,
    };
    let payload: CursorPayload = match serde_json::from_slice(&bytes) {
        Ok(p) => p,
        Err(_) => return 0,
    };
    payload.offset.min(MAX_OFFSET)
}

/// Encode a page offset as a base64url cursor string.
pub(crate) fn encode_cursor(offset: u32) -> String {
    let payload = CursorPayload { offset };
    let json = serde_json::to_vec(&payload).expect("cursor serialization is infallible");
    URL_SAFE_NO_PAD.encode(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_cursor_decodes_to_zero() {
        assert_eq!(decode_cursor(""), 0);
    }

    #[test]
    fn invalid_cursor_decodes_to_zero() {
        assert_eq!(decode_cursor("not-valid-base64!"), 0);
    }

    #[test]
    fn cursor_roundtrip() {
        let encoded = encode_cursor(42);
        assert_eq!(decode_cursor(&encoded), 42);
    }

    #[test]
    fn cursor_clamps_to_max_offset() {
        let encoded = encode_cursor(2000);
        assert_eq!(decode_cursor(&encoded), MAX_OFFSET);
    }
}
