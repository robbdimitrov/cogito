use axum::{
    Router,
    extract::{Multipart, Request, State},
    http::{
        HeaderMap, Method, StatusCode,
        header::{CACHE_CONTROL, HeaderValue},
    },
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::post,
};
use std::sync::Arc;
use tokio::{
    fs::{self, File},
    io::AsyncWriteExt,
};
use tower_http::services::ServeDir;
use uuid::Uuid;

use crate::db_client::ImageDb;

const IMAGE_CACHE_CONTROL: &str = "private, max-age=86400";

struct AppState<D: ImageDb> {
    db: D,
    image_dir: String,
}

pub fn create_router<D: ImageDb>(db: D, image_dir: String) -> Router {
    let state = Arc::new(AppState { db, image_dir });

    Router::new()
        .route(
            "/uploads",
            post(upload_handler::<D>).route_layer(middleware::from_fn(require_internal_token)),
        )
        .nest_service("/uploads/", ServeDir::new(state.image_dir.clone()))
        .layer(middleware::from_fn(cache_image_responses))
        .layer(axum::extract::DefaultBodyLimit::max(1024 * 1024))
        .with_state(state)
}

// Uploads are only reachable through the gateway, which forwards the shared
// internal token. Reject direct requests so the x-user-id header cannot be spoofed.
async fn require_internal_token(request: Request, next: Next) -> Response {
    let provided = request
        .headers()
        .get("internal-token")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if crate::internal_auth::token_matches(provided, &crate::internal_auth::internal_grpc_token()) {
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

async fn upload_handler<D: ImageDb>(
    headers: HeaderMap,
    State(state): State<Arc<AppState<D>>>,
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

        fs::create_dir_all(&state.image_dir)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "creating upload directory failed");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.".to_string())
            })?;

        let upload_id = Uuid::new_v4().to_string();
        let temp_filename = format!("{}.uploading", upload_id);
        let temp_path = std::path::Path::new(&state.image_dir).join(&temp_filename);
        let mut file = File::create(&temp_path)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "creating upload file failed");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.".to_string())
            })?;

        let mut total_bytes = 0;
        let mut signature = Vec::with_capacity(12);
        let limit = 1024 * 1024; // 1MB

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
                let _ = fs::remove_file(&temp_path).await;
                return Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "File exceeds 1MB limit".to_string(),
                ));
            }
            if signature.len() < 12 {
                let remaining = 12 - signature.len();
                signature.extend_from_slice(&chunk[..chunk.len().min(remaining)]);
            }
            file.write_all(&chunk)
                .await
                .map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "writing upload file failed");
                    (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.".to_string())
                })?;
        }

        let extension = match image_extension(&signature) {
            Some(extension) => extension,
            None => {
                let _ = fs::remove_file(&temp_path).await;
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Only images are allowed".to_string(),
                ));
            }
        };

        let filename = format!("{}.{}", upload_id, extension);
        let final_path = std::path::Path::new(&state.image_dir).join(&filename);
        drop(file);
        fs::rename(&temp_path, &final_path)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "finalizing upload file failed");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.".to_string())
            })?;

        if let Err(e) = state.db.insert_upload(&filename, user_id).await {
            tracing::warn!(request_id = %request_id, method = "POST /uploads", error = %e, "recording upload failed");
            let _ = fs::remove_file(&final_path).await;
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.".to_string()));
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
    use crate::db_client::ImageDb;
    use async_trait::async_trait;
    use axum::{
        body::Body,
        http::{
            Method, Request, StatusCode,
            header::{CACHE_CONTROL, CONTENT_RANGE, IF_MODIFIED_SINCE, LAST_MODIFIED, RANGE},
        },
    };
    use std::fs;
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

    fn test_image_dir() -> (std::path::PathBuf, String) {
        let path = std::env::temp_dir().join(format!("imageservice-http-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        (path.clone(), path.to_string_lossy().into_owned())
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
        let (path, image_dir) = test_image_dir();
        fs::write(path.join("test.jpg"), [0xff, 0xd8, 0xff]).unwrap();
        let app = create_router(MockDb, image_dir);

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
            assert!(response.headers().contains_key(LAST_MODIFIED));
        }

        fs::remove_dir_all(path).unwrap();
    }

    #[tokio::test]
    async fn missing_images_are_not_cached() {
        let (path, image_dir) = test_image_dir();
        let response = create_router(MockDb, image_dir)
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
        fs::remove_dir_all(path).unwrap();
    }

    #[tokio::test]
    async fn upload_errors_are_not_cached() {
        let (path, image_dir) = test_image_dir();
        let response = create_router(MockDb, image_dir)
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/uploads")
                    .header(
                        "internal-token",
                        crate::internal_auth::internal_grpc_token(),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert!(!response.headers().contains_key(CACHE_CONTROL));
        fs::remove_dir_all(path).unwrap();
    }

    #[tokio::test]
    async fn upload_without_internal_token_is_rejected() {
        let (path, image_dir) = test_image_dir();
        let response = create_router(MockDb, image_dir)
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
        fs::remove_dir_all(path).unwrap();
    }

    #[tokio::test]
    async fn conditional_image_requests_keep_static_file_behavior() {
        let (path, image_dir) = test_image_dir();
        fs::write(path.join("test.jpg"), [0xff, 0xd8, 0xff]).unwrap();
        let app = create_router(MockDb, image_dir);

        let initial = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/uploads/test.jpg")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let last_modified = initial.headers().get(LAST_MODIFIED).unwrap().clone();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/uploads/test.jpg")
                    .header(IF_MODIFIED_SINCE, last_modified)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_MODIFIED);
        assert_eq!(
            response.headers().get(CACHE_CONTROL).unwrap(),
            IMAGE_CACHE_CONTROL
        );
        fs::remove_dir_all(path).unwrap();
    }

    #[tokio::test]
    async fn range_requests_keep_static_file_behavior() {
        let (path, image_dir) = test_image_dir();
        fs::write(path.join("test.jpg"), [0xff, 0xd8, 0xff]).unwrap();

        let response = create_router(MockDb, image_dir)
            .oneshot(
                Request::builder()
                    .uri("/uploads/test.jpg")
                    .header(RANGE, "bytes=0-1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(
            response.headers().get(CONTENT_RANGE).unwrap(),
            "bytes 0-1/3"
        );
        assert_eq!(
            response.headers().get(CACHE_CONTROL).unwrap(),
            IMAGE_CACHE_CONTROL
        );
        fs::remove_dir_all(path).unwrap();
    }
}
