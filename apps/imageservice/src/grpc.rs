use std::sync::Arc;
use tonic::{Request, Response, Status};

use crate::blobstore::BlobStore;
use crate::db_client::ImageDb;
use crate::cogito::image_service_server::ImageService;
use crate::cogito::{ConsumeUploadRequest, DeleteImageRequest, Empty, VerifyUploadRequest};

pub struct ImageGrpcService<D: ImageDb> {
    db: D,
    blobstore: Arc<dyn BlobStore>,
}

impl<D: ImageDb> ImageGrpcService<D> {
    pub fn new(db: D, blobstore: Arc<dyn BlobStore>) -> Self {
        Self { db, blobstore }
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
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/VerifyUpload", error = %e, "verifying upload failed");
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
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/ConsumeUpload", error = %e, "consuming upload failed");
                Status::internal("Internal server error.")
            })?;

        self.blobstore
            .copy(
                &format!("staging/{}", req.filename),
                &req.filename,
            )
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/ConsumeUpload", error = %e, "promoting staged upload failed");
                Status::internal("Internal server error.")
            })?;

        if let Err(e) = self
            .blobstore
            .delete(&format!("staging/{}", req.filename))
            .await
        {
            tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/ConsumeUpload", error = %e, "deleting staged upload failed");
        }

        Ok(Response::new(Empty {}))
    }

    async fn delete_image(
        &self,
        request: Request<DeleteImageRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::grpc_request_id(&request).to_string();
        let req = request.into_inner();

        if let Err(e) = self.db.consume_upload(&req.filename).await {
            tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/DeleteImage", error = %e, "cleaning up orphaned upload metadata failed");
        }

        if req.filename.contains("..") || req.filename.contains('/') || req.filename.contains('\\')
        {
            return Err(Status::invalid_argument("Invalid filename"));
        }

        self.blobstore
            .delete(&req.filename)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/DeleteImage", error = %e, "deleting image failed");
                Status::internal("Internal server error.")
            })?;

        if let Err(e) = self
            .blobstore
            .delete(&format!("staging/{}", req.filename))
            .await
        {
            tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/DeleteImage", error = %e, "deleting staged image failed");
        }

        Ok(Response::new(Empty {}))
    }
}
