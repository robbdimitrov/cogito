use tonic::{Request, Response, Status};
use tokio::fs;

use crate::thoughts::image_service_server::ImageService;
use crate::thoughts::{VerifyUploadRequest, ConsumeUploadRequest, DeleteImageRequest, Empty};
use crate::db::Db;

pub struct ImageGrpcService {
    db: Db,
    image_dir: String,
}

impl ImageGrpcService {
    pub fn new(db: Db, image_dir: String) -> Self {
        Self { db, image_dir }
    }
}

#[tonic::async_trait]
impl ImageService for ImageGrpcService {
    async fn verify_upload(
        &self,
        request: Request<VerifyUploadRequest>,
    ) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();
        let is_valid = self.db.verify_upload(&req.filename, req.user_id).await
            .map_err(|e| Status::internal(e.to_string()))?;
            
        if !is_valid {
            return Err(Status::not_found("Upload not found or not owned by user"));
        }
        
        Ok(Response::new(Empty {}))
    }

    async fn consume_upload(
        &self,
        request: Request<ConsumeUploadRequest>,
    ) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();
        self.db.consume_upload(&req.filename).await
            .map_err(|e| Status::internal(e.to_string()))?;
            
        Ok(Response::new(Empty {}))
    }

    async fn delete_image(
        &self,
        request: Request<DeleteImageRequest>,
    ) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();
        
        // Also cleanup uploads table just in case it was an orphaned staging file
        let _ = self.db.consume_upload(&req.filename).await;

        // Ensure we don't allow directory traversal
        let safe_filename = req.filename.replace("..", "").replace("/", "");
        let file_path = std::path::Path::new(&self.image_dir).join(safe_filename);
        
        if file_path.exists() {
            fs::remove_file(file_path).await
                .map_err(|e| Status::internal(format!("Failed to delete file: {}", e)))?;
        }
        
        Ok(Response::new(Empty {}))
    }
}
