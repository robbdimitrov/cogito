use axum::{
    extract::{Multipart, State},
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Json},
    routing::post,
    Router,
};
use std::sync::Arc;
use tokio::{fs::File, io::AsyncWriteExt};
use uuid::Uuid;
use tower_http::services::ServeDir;

use crate::db::Db;

struct AppState {
    db: Db,
    image_dir: String,
}

pub fn create_router(db: Db, image_dir: String) -> Router {
    let state = Arc::new(AppState { db, image_dir });
    
    Router::new()
        .route("/upload", post(upload_handler))
        .nest_service("/", ServeDir::new(state.image_dir.clone()))
        .with_state(state)
}

async fn upload_handler(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_id_header = headers.get("x-user-id")
        .ok_or((StatusCode::UNAUTHORIZED, "Missing x-user-id header".to_string()))?;
        
    let user_id: i32 = user_id_header.to_str().unwrap_or("").parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user_id".to_string()))?;

    if let Some(mut field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))? {
        let content_type = field.content_type().unwrap_or("").to_string();
        if !content_type.starts_with("image/") {
            return Err((StatusCode::BAD_REQUEST, "Only images are allowed".to_string()));
        }

        let extension = match content_type.as_str() {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/gif" => "gif",
            "image/webp" => "webp",
            _ => "jpg",
        };

        let filename = format!("{}.{}", Uuid::new_v4(), extension);
        let filepath = std::path::Path::new(&state.image_dir).join(&filename);
        
        let mut file = File::create(&filepath).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        
        let mut total_bytes = 0;
        let limit = 1024 * 1024; // 1MB
        
        while let Some(chunk) = field.chunk().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))? {
            total_bytes += chunk.len();
            if total_bytes > limit {
                let _ = tokio::fs::remove_file(&filepath).await;
                return Err((StatusCode::PAYLOAD_TOO_LARGE, "File exceeds 1MB limit".to_string()));
            }
            file.write_all(&chunk).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        state.db.insert_upload(&filename, user_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        return Ok(Json(serde_json::json!({ "filename": filename })));
    }

    Err((StatusCode::BAD_REQUEST, "No file provided".to_string()))
}
