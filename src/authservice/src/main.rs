#[allow(clippy::all)]
pub mod thoughts;

mod controller;
mod db_client;
mod logging;

use std::env;
use thoughts::auth_service_server::AuthServiceServer;
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let addr = format!("0.0.0.0:{}", port).parse()?;
    tracing::info!(port = %port, "server starting");

    let db_client = db_client::DbClient::new(&db_url).await?;
    let pool = db_client.pool.clone();
    let controller = controller::Controller::new(db_client);

    let shutdown_signal = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        tracing::info!("server shutting down");
    };

    Server::builder()
        .add_service(AuthServiceServer::new(controller))
        .serve_with_shutdown(addr, shutdown_signal)
        .await?;

    pool.close().await;

    Ok(())
}
