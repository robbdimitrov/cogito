#[allow(clippy::all)]
#[rustfmt::skip]
pub mod cogito;

mod blobstore;
mod db_client;
mod grpc;
mod http;
mod internal_auth;
mod logging;

#[cfg(test)]
mod tests;

use cogito::image_service_server::ImageServiceServer;
use std::env;
use std::sync::Arc;
use tonic::transport::Server;

use blobstore::StorageBlobStore;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    internal_auth::init();
    let grpc_port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let http_port = env::var("HTTP_PORT").unwrap_or_else(|_| "8081".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let storage_endpoint = env::var("S3_ENDPOINT").expect("S3_ENDPOINT must be set");
    let storage_bucket = env::var("S3_BUCKET").expect("S3_BUCKET must be set");
    let storage_region = env::var("S3_REGION").expect("S3_REGION must be set");
    let storage_access_key = env::var("S3_ACCESS_KEY").expect("S3_ACCESS_KEY must be set");
    let storage_secret_key = env::var("S3_SECRET_KEY").expect("S3_SECRET_KEY must be set");
    let storage_provisioning_access_key = env::var("S3_PROVISIONING_ACCESS_KEY").ok();
    let storage_provisioning_secret_key = env::var("S3_PROVISIONING_SECRET_KEY").ok();
    let provisioning_credentials = match (
        storage_provisioning_access_key.as_deref(),
        storage_provisioning_secret_key.as_deref(),
    ) {
        (Some(access_key), Some(secret_key)) => Some((access_key, secret_key)),
        (None, None) => None,
        _ => {
            return Err(
                "S3_PROVISIONING_ACCESS_KEY and S3_PROVISIONING_SECRET_KEY must be set together"
                    .into(),
            );
        }
    };

    let db_client = db_client::DbClient::new(&db_url).await?;

    let blobstore = Arc::new(
        StorageBlobStore::new(
            &storage_endpoint,
            &storage_bucket,
            &storage_region,
            &storage_access_key,
            &storage_secret_key,
            provisioning_credentials,
        )
        .await?,
    );

    let router = http::create_router(db_client.clone(), blobstore.clone());
    let http_addr = format!("0.0.0.0:{}", http_port);
    let listener = tokio::net::TcpListener::bind(&http_addr).await?;

    tracing::info!(port = %http_port, "http server starting");

    let grpc_addr = format!("0.0.0.0:{}", grpc_port).parse()?;
    let grpc_service = grpc::ImageGrpcService::new(db_client.clone(), blobstore);

    tracing::info!(port = %grpc_port, "grpc server starting");

    let (shutdown_tx, _) = tokio::sync::broadcast::channel::<()>(1);
    let mut shutdown_rx1 = shutdown_tx.subscribe();
    let mut shutdown_rx2 = shutdown_tx.subscribe();

    tokio::spawn(async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        tracing::info!("server shutting down");
        let _ = shutdown_tx.send(());
    });

    let axum_server = axum::serve(listener, router).with_graceful_shutdown(async move {
        let _ = shutdown_rx1.recv().await;
    });

    let grpc_server = Server::builder()
        .add_service(ImageServiceServer::with_interceptor(
            grpc_service,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(grpc_addr, async move {
            let _ = shutdown_rx2.recv().await;
        });

    let (axum_res, grpc_res) = tokio::join!(axum_server, grpc_server);
    if let Err(e) = axum_res {
        tracing::error!(error = %e, "http server error");
    }
    if let Err(e) = grpc_res {
        tracing::error!(error = %e, "grpc server error");
    }

    db_client.pool.close().await;

    Ok(())
}
