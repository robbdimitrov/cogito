use axum::{
    extract::{Multipart, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::post,
    Router,
};
use std::sync::Arc;
use tokio::{
    fs::{self, File},
    io::AsyncWriteExt,
};
use tower_http::services::ServeDir;
use uuid::Uuid;

use crate::db_client::ImageDb;

struct AppState<D: ImageDb> {
    db: D,
    image_dir: String,
}

pub fn create_router<D: ImageDb>(db: D, image_dir: String) -> Router {
    let state = Arc::new(AppState { db, image_dir });

    Router::new()
        .route("/uploads", post(upload_handler::<D>))
        .nest_service("/uploads", ServeDir::new(state.image_dir.clone()))
        .with_state(state)
}

async fn upload_handler<D: ImageDb>(
    headers: HeaderMap,
    State(state): State<Arc<AppState<D>>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
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
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() != Some("image") {
            continue;
        }

        fs::create_dir_all(&state.image_dir)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let upload_id = Uuid::new_v4().to_string();
        let temp_filename = format!("{}.uploading", upload_id);
        let temp_path = std::path::Path::new(&state.image_dir).join(&temp_filename);
        let mut file = File::create(&temp_path)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let mut total_bytes = 0;
        let mut signature = Vec::with_capacity(12);
        let limit = 1024 * 1024; // 1MB

        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
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
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Err(e) = state.db.insert_upload(&filename, user_id).await {
            let _ = fs::remove_file(&final_path).await;
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
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
    use super::image_extension;

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
}
