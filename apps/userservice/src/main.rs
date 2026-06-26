pub mod controller;
pub mod crypto;
pub mod db_client;
pub mod internal_auth;
pub mod logging;
pub mod pagination;
#[allow(clippy::all)]
#[rustfmt::skip]
pub mod cogito;
pub mod utils;

#[cfg(test)]
mod tests;

use std::env;
use tokio::signal;
use tonic::transport::Server;

use cogito::user_service_server::UserServiceServer;
use controller::Controller;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let addr = format!("0.0.0.0:{}", port).parse()?;
    tracing::info!(port = %port, "server starting");

    internal_auth::init();

    let db_client = db_client::DbClient::new(&db_url).await?;
    let pool = db_client.pool.clone();
    let controller = Controller::new(db_client);

    // Graceful shutdown handler
    let shutdown = async {
        signal::ctrl_c()
            .await
            .expect("failed to install CTRL+C signal handler");
        tracing::info!("server shutting down");
    };

    Server::builder()
        .add_service(UserServiceServer::with_interceptor(
            controller,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(addr, shutdown)
        .await?;

    pool.close().await;

    Ok(())
}
