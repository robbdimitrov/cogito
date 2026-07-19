use std::sync::Arc;
use tonic::{Request, Response, Status};

use crate::blobstore::BlobStore;
use crate::cogito::image_service_server::ImageService;
use crate::cogito::{ConsumeUploadRequest, DeleteImageRequest, Empty, VerifyUploadRequest};
use crate::db_client::ImageDb;

pub struct ImageGrpcService<D: ImageDb> {
    db: D,
    blobstore: Arc<dyn BlobStore>,
}

impl<D: ImageDb> ImageGrpcService<D> {
    pub fn new(db: D, blobstore: Arc<dyn BlobStore>) -> Self {
        Self { db, blobstore }
    }
}

// tonic::Status is mandated by this function's gRPC-handler callers; boxing
// it isn't practical here.
#[allow(clippy::result_large_err)]
fn validate_filename(filename: &str) -> Result<(), Status> {
    if filename.is_empty()
        || filename.len() > 255
        || filename.contains("..")
        || filename.contains('/')
        || filename.contains('\\')
    {
        return Err(Status::invalid_argument("Invalid filename"));
    }
    Ok(())
}

#[tonic::async_trait]
impl<D: ImageDb> ImageService for ImageGrpcService<D> {
    async fn verify_upload(
        &self,
        request: Request<VerifyUploadRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::grpc_request_id(&request).to_string();
        let req = request.into_inner();
        validate_filename(&req.filename)?;
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
        validate_filename(&req.filename)?;

        // Confirm ownership without deleting the claim yet: promoting the blob
        // isn't atomic, so the row must survive until the copy succeeds.
        let owned = self
            .db
            .verify_upload(&req.filename, req.user_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/ConsumeUpload", error = %e, "checking upload ownership failed");
                Status::internal("Internal server error.")
            })?;
        if !owned {
            return Err(Status::not_found("Upload not found or not owned by user"));
        }

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

        // Blob is promoted; finalize the claim. A concurrent caller may have
        // already finalized it, so zero rows affected is not an error.
        self.db
            .consume_upload(&req.filename, req.user_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/ConsumeUpload", error = %e, "finalizing upload claim failed");
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

        validate_filename(&req.filename)?;

        if let Err(e) = self.db.delete_upload_metadata(&req.filename).await {
            tracing::warn!(request_id = %request_id, method = "/cogito.ImageService/DeleteImage", error = %e, "cleaning up orphaned upload metadata failed");
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
