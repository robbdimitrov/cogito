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

/// Overall request-body ceiling, deliberately well above the per-field 1 MB
/// image limit below: it exists to bound abusive/garbage multipart bodies
/// (many oversized non-"image" fields), not to duplicate the image limit. If
/// it sat close to 1 MB, a legitimate ~1 MB image plus ordinary multipart
/// boundary/header overhead could trip this router-level limit before the
/// field-level check below ever runs, replacing the specific 413 "File
/// exceeds 1MB limit" response with a generic, unhelpful body-read error.
const MAX_REQUEST_BODY_BYTES: usize = 2 * 1024 * 1024;
const MAX_IMAGE_FIELD_BYTES: usize = 1024 * 1024;

fn json_error(status: StatusCode, message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (status, Json(serde_json::json!({ "message": message })))
}

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
        .layer(axum::extract::DefaultBodyLimit::max(MAX_REQUEST_BODY_BYTES))
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
        json_error(StatusCode::UNAUTHORIZED, "Unauthorized").into_response()
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
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(json_error(StatusCode::BAD_REQUEST, "Invalid filename"));
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
        Ok(None) => Err(json_error(StatusCode::NOT_FOUND, "Not found")),
        Err(e) => {
            tracing::warn!(error = %e, "blobstore get failed");
            Err(json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.",
            ))
        }
    }
}

async fn upload_handler<D: ImageDb, B: BlobStore>(
    headers: HeaderMap,
    State(state): State<Arc<AppState<D, B>>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let request_id = crate::logging::http_request_id(&headers).to_string();
    let user_id_header = headers
        .get("x-user-id")
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing x-user-id header"))?;

    let user_id: i32 = user_id_header
        .to_str()
        .unwrap_or("")
        .parse()
        .map_err(|_| json_error(StatusCode::BAD_REQUEST, "Invalid user_id"))?;

    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "reading multipart field failed");
            json_error(StatusCode::BAD_REQUEST, "Invalid upload.")
        })?
    {
        if field.name() != Some("image") {
            continue;
        }

        let mut data: Vec<u8> = Vec::new();
        let mut total_bytes = 0;
        let mut signature = Vec::with_capacity(12);

        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "reading upload chunk failed");
                json_error(StatusCode::BAD_REQUEST, "Invalid upload.")
            })?
        {
            total_bytes += chunk.len();
            if total_bytes > MAX_IMAGE_FIELD_BYTES {
                return Err(json_error(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "File exceeds 1MB limit",
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
                return Err(json_error(StatusCode::BAD_REQUEST, "Only images are allowed"));
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
                json_error(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.")
            })?;

        if let Err(e) = state.db.insert_upload(&filename, user_id).await {
            tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "recording upload failed");
            let _ = state.blobstore.delete(&staging_key).await;
            return Err(json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.",
            ));
        }

        return Ok(Json(serde_json::json!({ "filename": filename })));
    }

    Err(json_error(StatusCode::BAD_REQUEST, "No file provided"))
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

        async fn consume_upload(
            &self,
            _filename: &str,
            _user_id: i32,
        ) -> Result<bool, sqlx::Error> {
            Ok(true)
        }

        async fn delete_upload_metadata(&self, _filename: &str) -> Result<(), sqlx::Error> {
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
        // A file just over the 1MB field limit but comfortably under the
        // router's 2MB body ceiling must deterministically hit the specific
        // per-field check (413 JSON), not fall through to the generic
        // multipart-read-error path (400) — regression test for the router
        // limit sitting too close to the field limit.
        let store = MockBlobStore::new();
        let oversized: Vec<u8> = {
            let mut v = vec![0xff, 0xd8, 0xff];
            v.extend(std::iter::repeat_n(0u8, 1024 * 1024 + 1));
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

        assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["message"], "File exceeds 1MB limit");
    }

    #[tokio::test]
    async fn upload_rejects_body_beyond_router_limit_as_json() {
        // A body well beyond the router's own 2MB ceiling can't reach the
        // field-level check at all; it must still fail as valid JSON (not a
        // raw framework/plaintext body), honoring the API-wide JSON contract.
        let store = MockBlobStore::new();
        let huge: Vec<u8> = {
            let mut v = vec![0xff, 0xd8, 0xff];
            v.extend(std::iter::repeat_n(0u8, 3 * 1024 * 1024));
            v
        };
        let (boundary, body) = multipart_body(&huge);

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

        assert!(!response.status().is_success());
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or_else(|e| {
            panic!("expected valid JSON error body, got parse error {e}: {body:?}")
        });
        assert!(json["message"].is_string());
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
