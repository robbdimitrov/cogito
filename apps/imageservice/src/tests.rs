use async_trait::async_trait;
use bytes::Bytes;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as TokioMutex;
use tonic::Request;

use crate::blobstore::BlobStore;
use crate::cogito::image_service_server::ImageService;
use crate::cogito::{ConsumeUploadRequest, DeleteImageRequest, VerifyUploadRequest};
use crate::db_client::ImageDb;
use crate::grpc::ImageGrpcService;

struct MockDb {
    uploads: TokioMutex<Vec<(String, i32)>>,
}

impl MockDb {
    fn new() -> Self {
        Self {
            uploads: TokioMutex::new(vec![("test.jpg".to_string(), 1)]),
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

    async fn consume_upload(&self, filename: &str, user_id: i32) -> Result<bool, sqlx::Error> {
        let mut uploads = self.uploads.lock().await;
        let before = uploads.len();
        uploads.retain(|(f, owner)| !(f == filename && *owner == user_id));
        Ok(uploads.len() != before)
    }

    async fn delete_upload_metadata(&self, filename: &str) -> Result<(), sqlx::Error> {
        let mut uploads = self.uploads.lock().await;
        uploads.retain(|(f, _)| f != filename);
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

    fn contains(&self, key: &str) -> bool {
        self.data.lock().unwrap().contains_key(key)
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

fn make_service(db: Arc<MockDb>, store: MockBlobStore) -> ImageGrpcService<Arc<MockDb>> {
    ImageGrpcService::new(db, Arc::new(store))
}

#[tokio::test]
async fn test_verify_upload_success() {
    let db = Arc::new(MockDb::new());
    let service = make_service(db, MockBlobStore::new());

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
    let service = make_service(db, MockBlobStore::new());

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
    let service = make_service(db, MockBlobStore::new());

    let req = Request::new(DeleteImageRequest {
        filename: "../../../etc/passwd".to_string(),
    });

    let res = service.delete_image(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::InvalidArgument);
}

#[tokio::test]
async fn test_consume_upload_promotes_and_cleans_staging() {
    let db = Arc::new(MockDb::new());
    let store = MockBlobStore::new();
    store.seed("staging/test.jpg", "image/jpeg", vec![0xff, 0xd8, 0xff]);

    let service = make_service(db.clone(), store.clone());

    let req = Request::new(ConsumeUploadRequest {
        filename: "test.jpg".to_string(),
        user_id: 1,
    });

    let res = service.consume_upload(req).await;
    assert!(res.is_ok());

    let uploads = db.uploads.lock().await;
    assert!(uploads.is_empty());

    assert!(store.contains("test.jpg"));
    assert!(!store.contains("staging/test.jpg"));
}

#[tokio::test]
async fn test_consume_upload_rejects_wrong_owner() {
    let db = Arc::new(MockDb::new());
    let store = MockBlobStore::new();
    store.seed("staging/test.jpg", "image/jpeg", vec![0xff, 0xd8, 0xff]);

    let service = make_service(db.clone(), store.clone());

    let req = Request::new(ConsumeUploadRequest {
        filename: "test.jpg".to_string(),
        user_id: 2,
    });

    let res = service.consume_upload(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::NotFound);

    let uploads = db.uploads.lock().await;
    assert_eq!(uploads.len(), 1);
    assert!(!store.contains("test.jpg"));
    assert!(store.contains("staging/test.jpg"));
}

#[tokio::test]
async fn test_consume_upload_copy_failure_preserves_claim() {
    let db = Arc::new(MockDb::new());
    let store = MockBlobStore::new();
    // No staging file seeded, so the blobstore copy fails because the
    // source key is missing.

    let service = make_service(db.clone(), store.clone());

    let req = Request::new(ConsumeUploadRequest {
        filename: "test.jpg".to_string(),
        user_id: 1,
    });

    let res = service.consume_upload(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);

    // The DB claim must survive a failed copy, or a retry would have nothing
    // left to reference for the promotion.
    let uploads = db.uploads.lock().await;
    assert_eq!(uploads.len(), 1);
    assert_eq!(uploads[0], ("test.jpg".to_string(), 1));
}

#[tokio::test]
async fn test_verify_upload_rejects_invalid_filename() {
    let db = Arc::new(MockDb::new());
    let service = make_service(db, MockBlobStore::new());

    let req = Request::new(VerifyUploadRequest {
        filename: "../test.jpg".to_string(),
        user_id: 1,
    });

    let res = service.verify_upload(req).await;
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().code(), tonic::Code::InvalidArgument);
}
