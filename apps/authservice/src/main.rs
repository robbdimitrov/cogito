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
    let session_hmac_secret =
        env::var("SESSION_HMAC_SECRET").expect("SESSION_HMAC_SECRET must be set");

    let addr = format!("0.0.0.0:{}", port).parse()?;
    tracing::info!(port = %port, "server starting");

    let db_client = db_client::DbClient::new(&db_url).await?;
    let pool = db_client.pool.clone();

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);

    // Periodically purge expired sessions instead of on every read path.
    let cleanup_client = db_client.clone();
    let cleanup_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(SESSION_CLEANUP_INTERVAL);
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = cleanup_client.delete_expired_sessions().await {
                        tracing::warn!(error = %e, "failed to delete expired sessions");
                    }
                }
                _ = shutdown_rx.changed() => {
                    tracing::info!("cleanup task shutting down");
                    break;
                }
            }
        }
    });

    let controller = controller::Controller::new(db_client, session_hmac_secret);

    let shutdown_signal = async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
        let _ = shutdown_tx.send(true);
        tracing::info!("server shutting down");
    };

    Server::builder()
        .add_service(AuthServiceServer::with_interceptor(
            controller,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(addr, shutdown_signal)
        .await?;

    let _ = cleanup_task.await;
    pool.close().await;

    Ok(())
}
