use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;
use tonic::{Request, Status};

use crate::db_client::ImageDb;
use crate::grpc::ImageGrpcService;
use crate::thoughts::image_service_server::ImageService;
use crate::thoughts::{ConsumeUploadRequest, DeleteImageRequest, VerifyUploadRequest};

struct MockDb {
    uploads: Mutex<Vec<(String, i32)>>,
}

impl MockDb {
    fn new() -> Self {
        Self {
            uploads: Mutex::new(vec![("test.jpg".to_string(), 1)]),
        }
    }
}

#[async_trait]
impl ImageDb for Arc<MockDb> {
    async fn insert_upload(&self, filename: &str, user_id: i32) -> Result<(), sqlx::Error> {
        let mut uploads = self.uploads.lock().await;
        uploads.push((filename.to_string(), user_id));
        Ok(())
    }

    async fn verify_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error> {
        let uploads = self.uploads.lock().await;
        Ok(uploads.contains(&(filename.to_string(), user_id)))
    }

    async fn consume_upload(&self, filename: &str) -> Result<(), sqlx::Error> {
        let mut uploads = self.uploads.lock().await;
        uploads.retain(|(f, _)| f != filename);
        Ok(())
    }
}

#[tokio::test]
async fn test_verify_upload_success() {
    let db = Arc::new(MockDb::new());
    let service = ImageGrpcService::new(db, "/tmp".to_string());

    let req = Request::new(VerifyUploadRequest {
        filename: "test.jpg".to_string(),
        user_id: 1,
    });

    let res = service.verify_upload(req).await;
    assert!(res.is_ok());
}

#[tokio::test]
async fn test_verify_upload_not_found() {
    let db = Arc::new(MockDb::new());
    let service = ImageGrpcService::new(db, "/tmp".to_string());

    let req = Request::new(VerifyUploadRequest {
        filename: "test2.jpg".to_string(),
        user_id: 1,
    });

    let res = service.verify_upload(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::NotFound);
}

#[tokio::test]
async fn test_delete_image_traversal_protection() {
    let db = Arc::new(MockDb::new());
    let service = ImageGrpcService::new(db, "/tmp".to_string());

    let req = Request::new(DeleteImageRequest {
        filename: "../../../etc/passwd".to_string(),
    });

    let res = service.delete_image(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::InvalidArgument);
}

#[tokio::test]
async fn test_consume_upload_removes() {
    let db = Arc::new(MockDb::new());
    let service = ImageGrpcService::new(db.clone(), "/tmp".to_string());

    let req = Request::new(ConsumeUploadRequest {
        filename: "test.jpg".to_string(),
    });

    let res = service.consume_upload(req).await;
    assert!(res.is_ok());

    let uploads = db.uploads.lock().await;
    assert!(uploads.is_empty());
}
