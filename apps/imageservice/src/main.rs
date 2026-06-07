#[allow(clippy::all)]
pub mod thoughts;

mod db_client;
mod grpc;
mod http;
mod internal_auth;
mod logging;

#[cfg(test)]
mod tests;

use std::env;
use thoughts::image_service_server::ImageServiceServer;
use tokio::fs;
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    let grpc_port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let http_port = env::var("HTTP_PORT").unwrap_or_else(|_| "8081".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let image_dir = env::var("IMAGE_DIR").unwrap_or_else(|_| "/app/uploads".to_string());

    fs::create_dir_all(&image_dir).await?;

    let db_client = db_client::DbClient::new(&db_url).await?;

    let router = http::create_router(db_client.clone(), image_dir.clone());
    let http_addr = format!("0.0.0.0:{}", http_port);
    let listener = tokio::net::TcpListener::bind(&http_addr).await?;

    tracing::info!(port = %http_port, "http server starting");
    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let grpc_addr = format!("0.0.0.0:{}", grpc_port).parse()?;
    let grpc_service = grpc::ImageGrpcService::new(db_client.clone(), image_dir);

    tracing::info!(port = %grpc_port, "grpc server starting");

    let shutdown_signal = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        tracing::info!("server shutting down");
    };

    Server::builder()
        .add_service(ImageServiceServer::with_interceptor(
            grpc_service,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(grpc_addr, shutdown_signal)
        .await?;

    db_client.pool.close().await;

    Ok(())
}
