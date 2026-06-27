use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::transport::Channel;
use tonic::{Request, Response, Status};

use crate::cogito::search_service_server::SearchService;
use crate::cogito::user_service_client::UserServiceClient;
use crate::cogito::{Hashtag, Hashtags, Ids, Post, Posts, SearchRequest, User, Users};

use super::meili::{MeiliClient, UserHit, decode_cursor, encode_cursor};

const MAX_QUERY_CHARS: usize = 255;
const DEFAULT_LIMIT: u32 = 20;
const MAX_LIMIT: u32 = 50;

#[derive(Clone)]
pub struct SearchController {
    meili: Arc<RwLock<Option<MeiliClient>>>,
    user_client: Option<UserServiceClient<Channel>>,
}

impl SearchController {
    pub fn new(
        meili: Arc<RwLock<Option<MeiliClient>>>,
        user_client: Option<UserServiceClient<Channel>>,
    ) -> Self {
        Self { meili, user_client }
    }

    async fn meili_client(&self) -> Result<MeiliClient, Status> {
        self.meili
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
impl SearchService for SearchController {
    async fn search_users(
        &self,
        request: Request<SearchRequest>,
    ) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();
        let (query, limit, offset) = validate_request(&req)?;

        let meili = self.meili_client().await?;

        let mut hits = meili
            .search_users(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchUsers", error = %e, "meili search_users failed");
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

        let meili = self.meili_client().await?;

        let hits = meili
            .search_posts(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchPosts", error = %e, "meili search_posts failed");
                Status::internal("Internal server error.")
            })?;

        let (items, next_cursor) = paginate(hits, limit, offset, |h| Post {
            id: h.id,
            content: h.content,
            created: h.created_at,
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

        let meili = self.meili_client().await?;

        let hits = meili
            .search_hashtags(&query, limit + 1, offset)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.SearchService/SearchHashtags", error = %e, "meili search_hashtags failed");
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
}

/// Trim `hits` to `limit`, map each to `T`, and compute the next-page cursor.
///
/// The caller fetches `limit + 1` results; if more than `limit` came back the
/// extra item confirms there is a next page, and its position becomes the cursor.
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
        assert_eq!(super::super::meili::decode_cursor(&next_cursor), 2);
    }

    #[test]
    fn paginate_no_next_when_fewer_than_limit() {
        let hits = vec![1u32, 2]; // limit=3, only 2 returned
        let (items, next_cursor) = paginate(hits, 3, 0, |n| n);
        assert_eq!(items, [1, 2]);
        assert!(next_cursor.is_empty());
    }
}
