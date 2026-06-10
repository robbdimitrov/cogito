use tokio::fs;
use tonic::{Request, Response, Status};

use crate::db_client::ImageDb;
use crate::thoughts::image_service_server::ImageService;
use crate::thoughts::{ConsumeUploadRequest, DeleteImageRequest, Empty, VerifyUploadRequest};

pub struct ImageGrpcService<D: ImageDb> {
    db: D,
    image_dir: String,
}

impl<D: ImageDb> ImageGrpcService<D> {
    pub fn new(db: D, image_dir: String) -> Self {
        Self { db, image_dir }
    }
}

#[tonic::async_trait]
impl<D: ImageDb> ImageService for ImageGrpcService<D> {
    async fn verify_upload(
        &self,
        request: Request<VerifyUploadRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::grpc_request_id(&request).to_string();
        let req = request.into_inner();
        let is_valid = self
            .db
            .verify_upload(&req.filename, req.user_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/thoughts.ImageService/VerifyUpload", error = %e, "verifying upload failed");
                Status::internal("Internal server error.")
            })?;

        if !is_valid {
            return Err(Status::not_found("Upload not found or not owned by user"));
        }

        Ok(Response::new(Empty {}))
    }

    async fn consume_upload(
        &self,
        request: Request<ConsumeUploadRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::grpc_request_id(&request).to_string();
        let req = request.into_inner();
        self.db
            .consume_upload(&req.filename)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/thoughts.ImageService/ConsumeUpload", error = %e, "consuming upload failed");
                Status::internal("Internal server error.")
            })?;

        Ok(Response::new(Empty {}))
    }

    async fn delete_image(
        &self,
        request: Request<DeleteImageRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::grpc_request_id(&request).to_string();
        let req = request.into_inner();

        // Also cleanup uploads table just in case it was an orphaned staging file
        let _ = self.db.consume_upload(&req.filename).await;

        // Ensure we don't allow directory traversal
        if req.filename.contains("..") || req.filename.contains('/') || req.filename.contains('\\')
        {
            return Err(Status::invalid_argument("Invalid filename"));
        }
        let file_path = std::path::Path::new(&self.image_dir).join(&req.filename);

        if file_path.exists() {
            fs::remove_file(file_path)
                .await
                .map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "/thoughts.ImageService/DeleteImage", error = %e, "deleting image failed");
                    Status::internal("Internal server error.")
                })?;
        }

        Ok(Response::new(Empty {}))
    }
}
