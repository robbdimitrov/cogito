use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_s3::{
    Client,
    config::{Credentials, Region},
    primitives::ByteStream,
};
use bytes::Bytes;

#[async_trait]
pub trait BlobStore: Send + Sync {
    async fn put(&self, key: &str, content_type: &str, data: Bytes) -> Result<(), String>;
    async fn get(&self, key: &str) -> Result<Option<(Bytes, String)>, String>;
    async fn delete(&self, key: &str) -> Result<(), String>;
    async fn copy(&self, src_key: &str, dst_key: &str) -> Result<(), String>;
}

pub struct S3BlobStore {
    client: Client,
    bucket: String,
}

impl S3BlobStore {
    pub async fn new(
        endpoint: &str,
        bucket: &str,
        region: &str,
        access_key: &str,
        secret_key: &str,
    ) -> Result<Self, String> {
        let credentials = Credentials::new(access_key, secret_key, None, None, "static");
        let sdk_config = aws_config::defaults(BehaviorVersion::latest())
            .endpoint_url(endpoint)
            .region(Region::new(region.to_string()))
            .credentials_provider(credentials)
            .load()
            .await;
        let config = aws_sdk_s3::config::Builder::from(&sdk_config)
            .force_path_style(true)
            .build();
        let client = Client::from_conf(config);

        match client.create_bucket().bucket(bucket).send().await {
            Ok(_) => {}
            Err(e) => {
                let svc_err = e.into_service_error();
                if !svc_err.is_bucket_already_owned_by_you() && !svc_err.is_bucket_already_exists()
                {
                    return Err(format!("failed to create bucket: {svc_err}"));
                }
            }
        }

        Ok(Self {
            client,
            bucket: bucket.to_string(),
        })
    }
}

#[async_trait]
impl BlobStore for S3BlobStore {
    async fn put(&self, key: &str, content_type: &str, data: Bytes) -> Result<(), String> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| format!("s3 put failed: {e}"))?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Option<(Bytes, String)>, String> {
        let output = match self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
        {
            Ok(o) => o,
            Err(e) => {
                let svc_err = e.into_service_error();
                if svc_err.is_no_such_key() {
                    return Ok(None);
                }
                return Err(format!("s3 get failed: {svc_err}"));
            }
        };

        let content_type = output
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();
        let data = output
            .body
            .collect()
            .await
            .map_err(|e| format!("s3 body read failed: {e}"))?
            .into_bytes();

        Ok(Some((data, content_type)))
    }

    async fn delete(&self, key: &str) -> Result<(), String> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("s3 delete failed: {e}"))?;
        Ok(())
    }

    async fn copy(&self, src_key: &str, dst_key: &str) -> Result<(), String> {
        self.client
            .copy_object()
            .copy_source(format!("{}/{}", self.bucket, src_key))
            .bucket(&self.bucket)
            .key(dst_key)
            .send()
            .await
            .map_err(|e| format!("s3 copy failed: {e}"))?;
        Ok(())
    }
}
