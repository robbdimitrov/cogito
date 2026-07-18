use axum::{
    Router,
    extract::{Multipart, Path, Query, Request, State, rejection::QueryRejection},
    http::{
        HeaderMap, Method, StatusCode,
        header::{CACHE_CONTROL, CONTENT_TYPE, HeaderValue},
    },
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
};
use bytes::Bytes;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::blobstore::BlobStore;
use crate::db_client::ImageDb;

const IMAGE_CACHE_CONTROL: &str = "private, max-age=86400";

/// Fixed square dimension for the derived avatar/cover thumbnail; cover-fit
/// cropped so it renders cleanly for both circular and square avatar UI.
const THUMBNAIL_DIM: u32 = 128;
const THUMBNAIL_CONTENT_TYPE: &str = "image/jpeg";

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

#[derive(Deserialize)]
struct GetImageParams {
    size: Option<String>,
}

fn image_response(data: Bytes, content_type: &str) -> Response {
    (
        [(
            CONTENT_TYPE,
            HeaderValue::from_str(content_type)
                .unwrap_or(HeaderValue::from_static("application/octet-stream")),
        )],
        data,
    )
        .into_response()
}

async fn get_handler<D: ImageDb, B: BlobStore>(
    Path(filename): Path<String>,
    params: Result<Query<GetImageParams>, QueryRejection>,
    State(state): State<Arc<AppState<D, B>>>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(json_error(StatusCode::BAD_REQUEST, "Invalid filename"));
    }
    // Query extraction failures (malformed query string) must stay JSON-shaped
    // like every other error on this endpoint, not axum's plain-text default.
    let Query(params) = params.map_err(|_| json_error(StatusCode::BAD_REQUEST, "Invalid query"))?;

    // Allow-list of exactly one derived variant: bounds cache-key growth and
    // resize CPU cost to one thumbnail per original, not an arbitrary-resize
    // DoS surface.
    match params.size.as_deref() {
        None => get_original(&state, &filename).await,
        Some("thumb") => get_thumbnail(&state, &filename).await,
        Some(_) => Err(json_error(
            StatusCode::BAD_REQUEST,
            "Invalid size parameter",
        )),
    }
}

async fn get_original<D: ImageDb, B: BlobStore>(
    state: &AppState<D, B>,
    filename: &str,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    match state.blobstore.get(filename).await {
        Ok(Some((data, content_type))) => Ok(image_response(data, &content_type)),
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

async fn get_thumbnail<D: ImageDb, B: BlobStore>(
    state: &AppState<D, B>,
    filename: &str,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // Always derived from the already-validated filename, never from raw
    // client input, so the thumbnail key can't escape the original's namespace.
    let thumb_key = format!("thumb/{filename}");

    match state.blobstore.get(&thumb_key).await {
        Ok(Some((data, content_type))) => return Ok(image_response(data, &content_type)),
        Ok(None) => {}
        Err(e) => {
            tracing::warn!(error = %e, "blobstore get failed for thumbnail");
            return Err(json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.",
            ));
        }
    }

    let original = match state.blobstore.get(filename).await {
        Ok(Some((data, _content_type))) => data,
        Ok(None) => return Err(json_error(StatusCode::NOT_FOUND, "Not found")),
        Err(e) => {
            tracing::warn!(error = %e, "blobstore get failed");
            return Err(json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error.",
            ));
        }
    };

    let thumbnail = generate_thumbnail(&original).map_err(|e| {
        tracing::warn!(error = %e, "thumbnail generation failed");
        json_error(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.")
    })?;
    let thumbnail = Bytes::from(thumbnail);

    // A concurrent first request generating the same thumbnail races
    // harmlessly here: both writes are idempotent overwrites of the same key.
    if let Err(e) = state
        .blobstore
        .put(&thumb_key, THUMBNAIL_CONTENT_TYPE, thumbnail.clone())
        .await
    {
        tracing::warn!(error = %e, "thumbnail cache write failed");
        return Err(json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Internal server error.",
        ));
    }

    Ok(image_response(thumbnail, THUMBNAIL_CONTENT_TYPE))
}

// Uploads are already capped at MAX_IMAGE_FIELD_BYTES compressed bytes, but a
// pathological low-entropy image (e.g. a large solid-color PNG) can still
// expand hundreds of times on decode. `image`'s own default limits only cap
// allocation at 512MiB, well above what this service's container memory
// limit allows, so decoding one such image could get the pod OOM-killed
// before that check ever rejects it. These tighter limits reject oversized
// images from their header before a pixel buffer is allocated.
const MAX_DECODE_DIMENSION: u32 = 4096;
const MAX_DECODE_ALLOC_BYTES: u64 = 128 * 1024 * 1024;

/// Decodes `data`, cover-crops it to a fixed `THUMBNAIL_DIM` square, and
/// re-encodes as JPEG (flattening any transparency onto white, matching the
/// client-side upload compression in `image.ts`).
fn generate_thumbnail(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut reader = image::ImageReader::new(std::io::Cursor::new(data))
        .with_guessed_format()
        .map_err(|e| format!("format detection failed: {e}"))?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_DECODE_DIMENSION);
    limits.max_image_height = Some(MAX_DECODE_DIMENSION);
    limits.max_alloc = Some(MAX_DECODE_ALLOC_BYTES);
    reader.limits(limits);
    let img = reader.decode().map_err(|e| format!("decode failed: {e}"))?;
    let resized = img.resize_to_fill(
        THUMBNAIL_DIM,
        THUMBNAIL_DIM,
        image::imageops::FilterType::Lanczos3,
    );

    let rgba = resized.to_rgba8();
    let mut canvas = image::RgbImage::new(THUMBNAIL_DIM, THUMBNAIL_DIM);
    for (x, y, pixel) in rgba.enumerate_pixels() {
        let [r, g, b, a] = pixel.0;
        let alpha = a as f32 / 255.0;
        let over_white =
            |channel: u8| -> u8 { (channel as f32 * alpha + 255.0 * (1.0 - alpha)).round() as u8 };
        canvas.put_pixel(
            x,
            y,
            image::Rgb([over_white(r), over_white(g), over_white(b)]),
        );
    }

    let mut buf = Vec::new();
    image::DynamicImage::ImageRgb8(canvas)
        .write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageFormat::Jpeg,
        )
        .map_err(|e| format!("encode failed: {e}"))?;
    Ok(buf)
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
        http::{Method, Request, StatusCode, header::CACHE_CONTROL, header::CONTENT_TYPE},
    };
    use bytes::Bytes;
    use image::GenericImageView;
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

    fn real_jpeg() -> Vec<u8> {
        let img = image::RgbImage::from_fn(300, 200, |x, y| {
            image::Rgb([(x % 256) as u8, (y % 256) as u8, 128])
        });
        let mut buf = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(
                &mut std::io::Cursor::new(&mut buf),
                image::ImageFormat::Jpeg,
            )
            .unwrap();
        buf
    }

    #[tokio::test]
    async fn thumbnail_generation_rejects_oversized_dimensions() {
        // Wider than MAX_DECODE_DIMENSION but only 10px tall, so this fixture
        // stays cheap to encode even though its width exceeds the limit.
        let img = image::RgbImage::from_fn(super::MAX_DECODE_DIMENSION + 100, 10, |x, y| {
            image::Rgb([(x % 256) as u8, (y % 256) as u8, 0])
        });
        let mut buf = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(
                &mut std::io::Cursor::new(&mut buf),
                image::ImageFormat::Jpeg,
            )
            .unwrap();

        let store = MockBlobStore::new();
        store.seed("huge.jpg", "image/jpeg", buf);

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/huge.jpg?size=thumb")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[tokio::test]
    async fn thumbnail_generated_and_cached_on_first_request() {
        let store = MockBlobStore::new();
        store.seed("avatar.jpg", "image/jpeg", real_jpeg());
        let store_arc = Arc::new(store.clone());

        let response = create_router(MockDb, store_arc.clone())
            .oneshot(
                Request::builder()
                    .uri("/uploads/avatar.jpg?size=thumb")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers().get(CONTENT_TYPE).unwrap(), "image/jpeg");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let decoded = image::load_from_memory(&body).unwrap();
        assert_eq!(decoded.dimensions(), (128, 128));

        let cached = store.get("thumb/avatar.jpg").await.unwrap();
        assert!(cached.is_some());
    }

    #[tokio::test]
    async fn thumbnail_cache_hit_serves_without_regenerating() {
        // Seed only the thumb key; the original is intentionally absent so a
        // fall-through regeneration attempt would 404 instead of matching.
        let store = MockBlobStore::new();
        store.seed("thumb/avatar.jpg", "image/jpeg", vec![1, 2, 3, 4]);

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/avatar.jpg?size=thumb")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(body.as_ref(), &[1, 2, 3, 4]);
    }

    #[tokio::test]
    async fn thumbnail_responses_are_cached() {
        let store = MockBlobStore::new();
        store.seed("avatar.jpg", "image/jpeg", real_jpeg());

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/avatar.jpg?size=thumb")
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

    #[tokio::test]
    async fn invalid_size_value_is_rejected() {
        let store = MockBlobStore::new();
        store.seed("avatar.jpg", "image/jpeg", real_jpeg());

        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/avatar.jpg?size=huge")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn get_rejects_path_traversal_with_thumb_size() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/..%2Fetc%2Fpasswd?size=thumb")
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
    async fn malformed_query_string_returns_json_400() {
        let store = MockBlobStore::new();
        let response = create_router(MockDb, Arc::new(store))
            .oneshot(
                Request::builder()
                    .uri("/uploads/avatar.jpg?size=%FF")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or_else(|e| {
            panic!("expected valid JSON error body, got parse error {e}: {body:?}")
        });
        assert!(json["message"].is_string());
    }
}
