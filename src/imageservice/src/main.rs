#[allow(clippy::all)]
pub mod thoughts {
    tonic::include_proto!("thoughts");
}

mod db;
mod grpc;
mod http;

#[cfg(test)]
mod tests;

use std::env;
use tonic::transport::Server;
use tokio::fs;
use thoughts::image_service_server::ImageServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let grpc_port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let http_port = env::var("HTTP_PORT").unwrap_or_else(|_| "8081".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let image_dir = env::var("IMAGE_DIR").unwrap_or_else(|_| "/app/uploads".to_string());

    fs::create_dir_all(&image_dir).await?;

    let db = db::Db::new(&db_url).await?;

    let router = http::create_router(db.clone(), image_dir.clone());
    let http_addr = format!("0.0.0.0:{}", http_port);
    let listener = tokio::net::TcpListener::bind(&http_addr).await?;
    
    println!("HTTP Server is starting on port {}", http_port);
    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let grpc_addr = format!("0.0.0.0:{}", grpc_port).parse()?;
    let grpc_service = grpc::ImageGrpcService::new(db.clone(), image_dir);
    
    println!("gRPC Server is starting on port {}", grpc_port);
    
    let shutdown_signal = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        println!("Server is shutting down...");
    };

    Server::builder()
        .add_service(ImageServiceServer::new(grpc_service))
        .serve_with_shutdown(grpc_addr, shutdown_signal)
        .await?;

    db.pool.close().await;

    Ok(())
}
