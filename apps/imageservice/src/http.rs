use axum::{
    Router,
    extract::{Multipart, Path, Request, State},
    http::{
        HeaderMap, Method, StatusCode,
        header::{CACHE_CONTROL, CONTENT_TYPE, HeaderValue},
    },
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
};
use bytes::Bytes;
use std::sync::Arc;
use uuid::Uuid;

use crate::blobstore::BlobStore;
use crate::db_client::ImageDb;

const IMAGE_CACHE_CONTROL: &str = "private, max-age=86400";

struct AppState<D: ImageDb, B: BlobStore> {
    db: D,
    blobstore: Arc<B>,
}

pub fn create_router<D: ImageDb, B: BlobStore + 'static>(db: D, blobstore: Arc<B>) -> Router {
    let state = Arc::new(AppState { db, blobstore });

    Router::new()
        .route(
            "/uploads",
            post(upload_handler::<D, B>).route_layer(middleware::from_fn(require_internal_token)),
        )
        .route("/uploads/:filename", get(get_handler::<D, B>))
        .layer(middleware::from_fn(cache_image_responses))
        .layer(axum::extract::DefaultBodyLimit::max(1024 * 1024 + 8192))
        .with_state(state)
}

async fn require_internal_token(request: Request, next: Next) -> Response {
    let provided = request
        .headers()
        .get("internal-token")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if crate::internal_auth::verify(provided) {
        next.run(request).await
    } else {
        (StatusCode::UNAUTHORIZED, "Unauthorized").into_response()
    }
}

async fn cache_image_responses(request: Request, next: Next) -> Response {
    let cacheable_request = matches!(*request.method(), Method::GET | Method::HEAD)
        && request
            .uri()
            .path()
            .strip_prefix("/uploads/")
            .is_some_and(|filename| !filename.is_empty());
    let mut response = next.run(request).await;

    if cacheable_request
        && (response.status().is_success() || response.status() == StatusCode::NOT_MODIFIED)
    {
        response
            .headers_mut()
            .insert(CACHE_CONTROL, HeaderValue::from_static(IMAGE_CACHE_CONTROL));
    }
    response
}

async fn get_handler<D: ImageDb, B: BlobStore>(
    Path(filename): Path<String>,
    State(state): State<Arc<AppState<D, B>>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err((StatusCode::BAD_REQUEST, "Invalid filename".to_string()));
    }

    match state.blobstore.get(&filename).await {
        Ok(Some((data, content_type))) => Ok((
            [(
                CONTENT_TYPE,
                HeaderValue::from_str(&content_type)
                    .unwrap_or(HeaderValue::from_static("application/octet-stream")),
            )],
            data,
        )
            .into_response()),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Not found".to_string())),
        Err(e) => {
            tracing::warn!(error = %e, "blobstore get failed");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.".to_string(),
            ))
        }
    }
}

async fn upload_handler<D: ImageDb, B: BlobStore>(
    headers: HeaderMap,
    State(state): State<Arc<AppState<D, B>>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let request_id = crate::logging::http_request_id(&headers).to_string();
    let user_id_header = headers.get("x-user-id").ok_or((
        StatusCode::UNAUTHORIZED,
        "Missing x-user-id header".to_string(),
    ))?;

    let user_id: i32 = user_id_header
        .to_str()
        .unwrap_or("")
        .parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user_id".to_string()))?;

    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "reading multipart field failed");
            (StatusCode::BAD_REQUEST, "Invalid upload.".to_string())
        })?
    {
        if field.name() != Some("image") {
            continue;
        }

        let mut data: Vec<u8> = Vec::new();
        let mut total_bytes = 0;
        let mut signature = Vec::with_capacity(12);
        let limit = 1024 * 1024;

        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "reading upload chunk failed");
                (StatusCode::BAD_REQUEST, "Invalid upload.".to_string())
            })?
        {
            total_bytes += chunk.len();
            if total_bytes > limit {
                return Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "File exceeds 1MB limit".to_string(),
                ));
            }
            if signature.len() < 12 {
                let remaining = 12 - signature.len();
                signature.extend_from_slice(&chunk[..chunk.len().min(remaining)]);
            }
            data.extend_from_slice(&chunk);
        }

        let extension = match image_extension(&signature) {
            Some(ext) => ext,
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Only images are allowed".to_string(),
                ));
            }
        };

        let upload_id = Uuid::new_v4().to_string();
        let filename = format!("{}.{}", upload_id, extension);
        let content_type = match extension {
            "jpg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            _ => "application/octet-stream",
        };

        // staging/ prefix isolates unverified uploads from finalized images
        let staging_key = format!("staging/{}", filename);
        state
            .blobstore
            .put(&staging_key, content_type, Bytes::from(data))
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "staging upload failed");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error.".to_string(),
                )
            })?;

        if let Err(e) = state.db.insert_upload(&filename, user_id).await {
            tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "recording upload failed");
            let _ = state.blobstore.delete(&staging_key).await;
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.".to_string(),
            ));
        }

        return Ok(Json(serde_json::json!({ "filename": filename })));
    }

    Err((StatusCode::BAD_REQUEST, "No file provided".to_string()))
}

fn image_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        return Some("jpg");
    }
    if bytes.starts_with(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) {
        return Some("png");
    }
    if bytes.starts_with(b"GIF8") {
        return Some("gif");
    }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return Some("webp");
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{IMAGE_CACHE_CONTROL, create_router, image_extension};
    use crate::blobstore::BlobStore;
    use crate::db_client::ImageDb;
    use async_trait::async_trait;
    use axum::{
        body::Body,
        http::{Method, Request, StatusCode, header::CACHE_CONTROL},
    };
    use bytes::Bytes;
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use tower::ServiceExt;

    #[derive(Clone)]
    struct MockDb;

    #[async_trait]
    impl ImageDb for MockDb {
        async fn insert_upload(&self, _filename: &str, _user_id: i32) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn verify_upload(&self, _filename: &str, _user_id: i32) -> Result<bool, sqlx::Error> {
            Ok(true)
        }

        async fn consume_upload(&self, _filename: &str) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    #[derive(Clone)]
    struct MockBlobStore {
        data: Arc<Mutex<HashMap<String, (Bytes, String)>>>,
    }

    impl MockBlobStore {
        fn new() -> Self {
            Self {
                data: Arc::new(Mutex::new(HashMap::new())),
            }
        }

        fn seed(&self, key: &str, content_type: &str, data: impl Into<Bytes>) {
            self.data
                .lock()
                .unwrap()
                .insert(key.to_string(), (data.into(), content_type.to_string()));
        }
    }

    #[async_trait]
    impl BlobStore for MockBlobStore {
        async fn put(&self, key: &str, content_type: &str, data: Bytes) -> Result<(), String> {
            self.data
                .lock()
                .unwrap()
                .insert(key.to_string(), (data, content_type.to_string()));
            Ok(())
        }

        async fn get(&self, key: &str) -> Result<Option<(Bytes, String)>, String> {
            Ok(self.data.lock().unwrap().get(key).cloned())
        }

        async fn delete(&self, key: &str) -> Result<(), String> {
            self.data.lock().unwrap().remove(key);
            Ok(())
        }

        async fn copy(&self, src_key: &str, dst_key: &str) -> Result<(), String> {
            let entry = self.data.lock().unwrap().get(src_key).cloned();
            if let Some(e) = entry {
                self.data.lock().unwrap().insert(dst_key.to_string(), e);
                Ok(())
            } else {
                Err(format!("key not found: {src_key}"))
            }
        }
    }

    #[derive(Clone)]
    struct ErrorBlobStore;

    #[async_trait]
    impl BlobStore for ErrorBlobStore {
        async fn put(&self, _key: &str, _ct: &str, _data: Bytes) -> Result<(), String> {
            Err("put failed".to_string())
        }

        async fn get(&self, _key: &str) -> Result<Option<(Bytes, String)>, String> {
            Err("get failed".to_string())
        }

        async fn delete(&self, _key: &str) -> Result<(), String> {
            Err("delete failed".to_string())
        }

        async fn copy(&self, _src: &str, _dst: &str) -> Result<(), String> {
            Err("copy failed".to_string())
        }
    }

    fn valid_jpeg() -> Vec<u8> {
        let mut v = vec![0xff, 0xd8, 0xff];
        v.extend_from_slice(&[0u8; 100]);
        v
    }

    fn multipart_body(data: &[u8]) -> (String, Vec<u8>) {
        let boundary = "testboundary";
        let mut body = Vec::new();
        body.extend_from_slice(
            format!("--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"test.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").as_bytes(),
        );
        body.extend_from_slice(data);
        body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
        (boundary.to_string(), body)
    }

    #[test]
    fn image_extension_detects_supported_formats() {
        assert_eq!(image_extension(&[0xff, 0xd8, 0xff]), Some("jpg"));
        assert_eq!(
            image_extension(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            Some("png")
        );
        assert_eq!(image_extension(b"GIF89a"), Some("gif"));
        assert_eq!(image_extension(b"RIFFxxxxWEBP"), Some("webp"));
    }

    #[test]
    fn image_extension_rejects_unknown_bytes() {
        assert_eq!(image_extension(b"not an image"), None);
    }

    #[tokio::test]
    async fn image_get_and_head_responses_are_cached() {
        let store = MockBlobStore::new();
        store.seed("test.jpg", "image/jpeg", vec![0xff, 0xd8, 0xff]);
        let app = create_router(MockDb, Arc::new(store));

        for method in [Method::GET, Method::HEAD] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(method)
                        .uri("/uploads/test.jpg")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();

            assert_eq!(response.status(), StatusCode::OK);
            assert_eq!(
                response.headers().get(CACHE_CONTROL).unwrap(),
                IMAGE_CACHE_CONTROL
            );
        }
    }

    #[tokio::test]
    async fn missing_images_are_not_cached() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/missing.jpg")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert!(!response.headers().contains_key(CACHE_CONTROL));
    }

    #[tokio::test]
    async fn upload_errors_are_not_cached() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .header("internal-token", crate::internal_auth::init_for_test())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert!(!response.headers().contains_key(CACHE_CONTROL));
    }

    #[tokio::test]
    async fn upload_without_internal_token_is_rejected() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn upload_enforces_size_limit() {
        let store = MockBlobStore::new();
        let oversized: Vec<u8> = {
            let mut v = vec![0xff, 0xd8, 0xff];
            v.extend(std::iter::repeat(0u8).take(1024 * 1024 + 1));
            v
        };
        let (boundary, body) = multipart_body(&oversized);

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .header("internal-token", crate::internal_auth::init_for_test())
                    .header("x-user-id", "1")
                    .header(
                        "content-type",
                        format!("multipart/form-data; boundary={boundary}"),
                    )
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert!(
            response.status() == StatusCode::PAYLOAD_TOO_LARGE
                || response.status() == StatusCode::BAD_REQUEST
        );
    }

    #[tokio::test]
    async fn upload_rejects_non_image_content() {
        let store = MockBlobStore::new();
        let (boundary, body) = multipart_body(b"not an image at all");

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .header("internal-token", crate::internal_auth::init_for_test())
                    .header("x-user-id", "1")
                    .header(
                        "content-type",
                        format!("multipart/form-data; boundary={boundary}"),
                    )
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn upload_succeeds_with_valid_jpeg() {
        let store = MockBlobStore::new();
        let store_arc = Arc::new(store.clone());
        let (boundary, body) = multipart_body(&valid_jpeg());

        let response = create_router(MockDb, store_arc.clone())
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .header("internal-token", crate::internal_auth::init_for_test())
                    .header("x-user-id", "1")
                    .header(
                        "content-type",
                        format!("multipart/form-data; boundary={boundary}"),
                    )
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
        let filename = json["filename"].as_str().unwrap();
        assert!(filename.ends_with(".jpg"));

        let staging_key = format!("staging/{filename}");
        let stored = store.get(&staging_key).await.unwrap();
        assert!(stored.is_some());
    }

    #[tokio::test]
    async fn get_rejects_path_traversal() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/..%2Fetc%2Fpasswd")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert!(
            response.status() == StatusCode::BAD_REQUEST
                || response.status() == StatusCode::NOT_FOUND
        );
    }

    #[tokio::test]
    async fn blobstore_get_error_returns_500() {
        let response = create_router(MockDb, Arc::new(ErrorBlobStore))
            .oneshot(
                Request::builder()
                    .uri("/uploads/test.jpg")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
