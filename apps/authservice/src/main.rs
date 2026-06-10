#[allow(clippy::all)]
#[rustfmt::skip]
pub mod thoughts;

mod controller;
mod db_client;
mod internal_auth;
mod logging;

use std::env;
use std::time::Duration;
use thoughts::auth_service_server::AuthServiceServer;
use tonic::transport::Server;

const SESSION_CLEANUP_INTERVAL: Duration = Duration::from_secs(3600);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let addr = format!("0.0.0.0:{}", port).parse()?;
    tracing::info!(port = %port, "server starting");

    let db_client = db_client::DbClient::new(&db_url).await?;
    let pool = db_client.pool.clone();

    // Periodically purge expired sessions instead of on every read path.
    let cleanup_client = db_client.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(SESSION_CLEANUP_INTERVAL);
        loop {
            interval.tick().await;
            if let Err(e) = cleanup_client.delete_expired_sessions().await {
                tracing::warn!(error = %e, "failed to delete expired sessions");
            }
        }
    });

    let controller = controller::Controller::new(db_client);

    let shutdown_signal = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        tracing::info!("server shutting down");
    };

    Server::builder()
        .add_service(AuthServiceServer::with_interceptor(
            controller,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(addr, shutdown_signal)
        .await?;

    pool.close().await;

    Ok(())
}
