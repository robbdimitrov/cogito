use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::transport::Channel;
use tonic::{Request, Response, Status};

use crate::cogito::search_service_server::SearchService;
use crate::cogito::user_service_client::UserServiceClient;
use crate::cogito::{
    DeleteRecentSearchRequest, Empty, Hashtag, Hashtags, Ids, Post, Posts, RecentSearches,
    RecordRecentSearchRequest, SearchRequest, User, Users,
};
use crate::utils::get_user_id;

use super::client::{SearchClient, UserHit, decode_cursor, encode_cursor};
use super::db::{RecentSearchDb, normalize_recent_reference, validate_recent_search};

const MAX_QUERY_CHARS: usize = 255;
const DEFAULT_LIMIT: u32 = 20;
const MAX_LIMIT: u32 = 50;

#[derive(Clone)]
pub struct SearchController<D> {
    search: Arc<RwLock<Option<SearchClient>>>,
    user_client: Option<UserServiceClient<Channel>>,
    db: D,
}

impl<D: RecentSearchDb> SearchController<D> {
    pub fn new(
        search: Arc<RwLock<Option<SearchClient>>>,
        user_client: Option<UserServiceClient<Channel>>,
        db: D,
    ) -> Self {
        Self {
            search,
            user_client,
            db,
        }
    }

    async fn search_client(&self) -> Result<SearchClient, Status> {
        self.search
            .read()
            .await
            .clone()
            .ok_or_else(|| Status::unavailable("Search is temporarily unavailable"))
    }

    async fn fetch_full_users(&self, hits: &[UserHit], request_id: &str) -> Vec<User> {
        let ids: Vec<i32> = hits.iter().map(|h| h.id).collect();

        if let Some(ref client) = self.user_client {
            let mut client = client.clone();
            let mut req = tonic::Request::new(Ids { ids: ids.clone() });
            if let Ok(val) = crate::internal_auth::token().parse() {
                req.metadata_mut().insert("internal-token", val);
            }
            match client.get_users_by_ids(req).await {
                Ok(resp) => {
                    let by_id: std::collections::HashMap<i32, User> = resp
                        .into_inner()
                        .users
                        .into_iter()
                        .map(|u| (u.id, u))
                        .collect();
                    return hits
                        .iter()
                        .map(|h| {
                            by_id.get(&h.id).cloned().unwrap_or_else(|| User {
                                id: h.id,
                                username: h.username.clone(),
                                name: h.name.clone(),
                                ..Default::default()
                            })
                        })
                        .collect();
                }
                Err(e) => {
                    tracing::warn!(request_id = %request_id, error = %e, "userservice lookup failed, returning partial search results");
                }
            }
        }

        hits.iter()
            .map(|h| User {
                id: h.id,
                username: h.username.clone(),
                name: h.name.clone(),
                ..Default::default()
            })
            .collect()
    }
}

// tonic::Status is mandated by this function's gRPC-handler callers; boxing
// it isn't practical here.
#[allow(clippy::result_large_err)]
fn validate_request(req: &SearchRequest) -> Result<(String, u32, u32), Status> {
    let query = req.query.trim().to_string();
    if query.is_empty() || query.chars().count() > MAX_QUERY_CHARS {
        return Err(Status::invalid_argument("Query must be 1–255 characters."));
    }

    let limit = match u32::try_from(req.limit) {
        Ok(0) | Err(_) => DEFAULT_LIMIT,
        Ok(n) => n.min(MAX_LIMIT),
    };

    let offset = decode_cursor(&req.cursor);

    Ok((query, limit, offset))
}

#[tonic::async_trait]
impl<D: RecentSearchDb> SearchService for SearchController<D> {
    async fn search_users(
        &self,
        request: Request<SearchRequest>,
    ) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();
        let (query, limit, offset) = validate_request(&req)?;

        let search = self.search_client().await?;

        let mut hits = search
            .search_users(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchUsers", error = %e, "search client search_users failed");
                Status::internal("Internal server error.")
            })?;

        let has_next = hits.len() as u32 > limit;
        if has_next {
            hits.truncate(limit as usize);
        }
        let next_cursor = if has_next {
            encode_cursor(offset + limit)
        } else {
            String::new()
        };

        let users = self.fetch_full_users(&hits, &request_id).await;

        Ok(Response::new(Users { users, next_cursor }))
    }

    async fn search_posts(
        &self,
        request: Request<SearchRequest>,
    ) -> Result<Response<Posts>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();
        let (query, limit, offset) = validate_request(&req)?;

        let search = self.search_client().await?;

        let hits = search
            .search_posts(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchPosts", error = %e, "search client search_posts failed");
                Status::internal("Internal server error.")
            })?;

        let (items, next_cursor) = paginate(hits, limit, offset, |h| Post {
            id: h.id,
            user_id: h.author_id,
            content: h.content,
            created: h.created,
            ..Default::default()
        });

        Ok(Response::new(Posts {
            posts: items,
            next_cursor,
        }))
    }

    async fn search_hashtags(
        &self,
        request: Request<SearchRequest>,
    ) -> Result<Response<Hashtags>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();
        let (query, limit, offset) = validate_request(&req)?;

        let search = self.search_client().await?;

        let hits = search
            .search_hashtags(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchHashtags", error = %e, "search client search_hashtags failed");
                Status::internal("Internal server error.")
            })?;

        let (items, next_cursor) = paginate(hits, limit, offset, |h| Hashtag {
            id: h.id,
            name: h.name,
            post_count: h.post_count,
        });

        Ok(Response::new(Hashtags {
            hashtags: items,
            next_cursor,
        }))
    }

    async fn list_recent_searches(
        &self,
        request: Request<Empty>,
    ) -> Result<Response<RecentSearches>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let user_id = get_user_id(&request)?;
        let items = self.db.list_recent_searches(user_id).await.map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/ListRecentSearches", error = %e, "list recent searches failed");
            Status::internal("Internal server error.")
        })?;
        Ok(Response::new(RecentSearches { items }))
    }

    async fn record_recent_search(
        &self,
        request: Request<RecordRecentSearchRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();
        let entity_type = req.r#type.trim();
        let reference = normalize_recent_reference(entity_type, req.reference.trim());
        validate_recent_search(entity_type, &reference)?;

        self.db
            .record_recent_search(user_id, entity_type, &reference)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/RecordRecentSearch", error = %e, "record recent search failed");
                Status::internal("Internal server error.")
            })?;
        Ok(Response::new(Empty {}))
    }

    async fn delete_recent_search(
        &self,
        request: Request<DeleteRecentSearchRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();
        let public_id = req.id.trim();
        if !is_uuid(public_id) {
            return Err(Status::invalid_argument("Recent search ID is invalid."));
        }
        let deleted = self
            .db
            .delete_recent_search(user_id, public_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/DeleteRecentSearch", error = %e, "delete recent search failed");
                Status::internal("Internal server error.")
            })?;
        if !deleted {
            return Err(Status::not_found("Recent search not found."));
        }
        Ok(Response::new(Empty {}))
    }

    async fn clear_recent_searches(
        &self,
        request: Request<Empty>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let user_id = get_user_id(&request)?;
        self.db.clear_recent_searches(user_id).await.map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/ClearRecentSearches", error = %e, "clear recent searches failed");
            Status::internal("Internal server error.")
        })?;
        Ok(Response::new(Empty {}))
    }
}

fn is_uuid(value: &str) -> bool {
    value.len() == 36
        && value.bytes().enumerate().all(|(i, ch)| match i {
            8 | 13 | 18 | 23 => ch == b'-',
            _ => ch.is_ascii_hexdigit(),
        })
}

/// Trims `hits` to `limit`, maps each to `T`, and computes the next-page cursor.
/// Callers fetch `limit + 1`; a leftover item confirms another page exists.
fn paginate<H, T, F>(mut hits: Vec<H>, limit: u32, offset: u32, map: F) -> (Vec<T>, String)
where
    F: Fn(H) -> T,
{
    let has_next = hits.len() as u32 > limit;
    if has_next {
        hits.truncate(limit as usize);
    }
    let items: Vec<T> = hits.into_iter().map(map).collect();
    let next_cursor = if has_next {
        encode_cursor(offset + limit)
    } else {
        String::new()
    };
    (items, next_cursor)
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use std::sync::{Arc, Mutex};

    #[derive(Clone, Default)]
    struct FakeRecentSearchDb {
        recorded: Arc<Mutex<Option<(i32, String, String)>>>,
    }

    #[async_trait]
    impl RecentSearchDb for FakeRecentSearchDb {
        async fn list_recent_searches(
            &self,
            _user_id: i32,
        ) -> Result<Vec<crate::cogito::RecentSearch>, sqlx::Error> {
            Ok(Vec::new())
        }

        async fn record_recent_search(
            &self,
            user_id: i32,
            entity_type: &str,
            reference: &str,
        ) -> Result<(), sqlx::Error> {
            *self.recorded.lock().unwrap() =
                Some((user_id, entity_type.to_string(), reference.to_string()));
            Ok(())
        }

        async fn delete_recent_search(
            &self,
            _user_id: i32,
            _public_id: &str,
        ) -> Result<bool, sqlx::Error> {
            Ok(true)
        }

        async fn clear_recent_searches(&self, _user_id: i32) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    fn make_request(query: &str, limit: i32, cursor: &str) -> SearchRequest {
        SearchRequest {
            query: query.to_string(),
            limit,
            cursor: cursor.to_string(),
        }
    }

    #[test]
    fn validate_rejects_empty_query() {
        let req = make_request("", 10, "");
        assert!(validate_request(&req).is_err());
    }

    #[test]
    fn validate_rejects_query_over_255_chars() {
        let long = "a".repeat(256);
        let req = make_request(&long, 10, "");
        assert!(validate_request(&req).is_err());
    }

    #[test]
    fn validate_defaults_limit_zero_to_20() {
        let req = make_request("test", 0, "");
        let (_, limit, _) = validate_request(&req).unwrap();
        assert_eq!(limit, 20);
    }

    #[test]
    fn validate_clamps_limit_above_50() {
        let req = make_request("test", 100, "");
        let (_, limit, _) = validate_request(&req).unwrap();
        assert_eq!(limit, 50);
    }

    #[test]
    fn validate_accepts_255_char_query() {
        let q = "a".repeat(255);
        let req = make_request(&q, 10, "");
        assert!(validate_request(&req).is_ok());
    }

    #[test]
    fn paginate_trims_extra_hit_and_sets_cursor() {
        let hits = vec![1u32, 2, 3]; // limit=2, fetched limit+1=3
        let (items, next_cursor) = paginate(hits, 2, 0, |n| n);
        assert_eq!(items, [1, 2]);
        assert!(!next_cursor.is_empty());
        // next offset should be 0 + 2 = 2
        assert_eq!(super::super::client::decode_cursor(&next_cursor), 2);
    }

    #[test]
    fn uuid_validation_accepts_canonical_uuid() {
        assert!(is_uuid("01904d2e-7f4d-7c33-ae21-2f94737eaa10"));
    }

    #[test]
    fn uuid_validation_rejects_non_uuid() {
        assert!(!is_uuid("not-a-uuid"));
    }

    #[test]
    fn paginate_no_next_when_fewer_than_limit() {
        let hits = vec![1u32, 2]; // limit=3, only 2 returned
        let (items, next_cursor) = paginate(hits, 3, 0, |n| n);
        assert_eq!(items, [1, 2]);
        assert!(next_cursor.is_empty());
    }

    #[tokio::test]
    async fn record_recent_search_normalizes_entity_references_before_storage() {
        let db = FakeRecentSearchDb::default();
        let controller = SearchController::new(Arc::new(RwLock::new(None)), None, db.clone());
        let mut req = Request::new(RecordRecentSearchRequest {
            r#type: "hashtags".to_string(),
            reference: "RustLang".to_string(),
        });
        req.metadata_mut().insert("user-id", "42".parse().unwrap());

        controller.record_recent_search(req).await.unwrap();

        let recorded = db.recorded.lock().unwrap().clone();
        assert_eq!(
            recorded,
            Some((42, "hashtags".to_string(), "rustlang".to_string()))
        );
    }
}
