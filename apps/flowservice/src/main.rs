#[allow(clippy::all)]
#[rustfmt::skip]
pub mod cogito;

mod consumer_health;
mod feed;
mod internal_auth;
mod logging;
mod notifications;
mod search;
mod utils;

use std::env;
use std::sync::Arc;
use std::time::Duration;

use cogito::notification_service_server::NotificationServiceServer;
use cogito::search_service_server::SearchServiceServer;
use consumer_health::ConsumerProgress;
use feed::db::FeedDb;
use rdkafka::ClientConfig;
use rdkafka::consumer::StreamConsumer as BrokerConsumer;
use rdkafka::error::KafkaError as BrokerError;
use sqlx::PgPool as DatabasePool;

const DEFAULT_FAN_OUT_THRESHOLD: i32 = 10_000;
const CLEANUP_INTERVAL_SECS: u64 = 3600;
const SEARCH_CONNECT_TIMEOUT_SECS: u64 = 5;
const SEARCH_RECONNECT_INITIAL_SECS: u64 = 1;
const SEARCH_RECONNECT_MAX_SECS: u64 = 60;
const DB_MAX_CONNECTIONS: u32 = 10;
const DB_MAX_CONNECTION_LIFETIME: Duration = Duration::from_secs(30 * 60);
const DB_IDLE_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const GRPC_CLIENT_KEEPALIVE_INTERVAL: Duration = Duration::from_secs(30);
const GRPC_CLIENT_KEEPALIVE_TIMEOUT: Duration = Duration::from_secs(10);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    internal_auth::init();

    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let broker_addresses =
        env::var("REDPANDA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let search_host = env::var("MEILI_HOST").expect("MEILI_HOST must be set");
    let search_master_key = env::var("MEILI_MASTER_KEY").expect("MEILI_MASTER_KEY must be set");
    let fan_out_threshold = env::var("FAN_OUT_THRESHOLD")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_FAN_OUT_THRESHOLD);

    let addr = format!("0.0.0.0:{}", port).parse()?;

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(DB_MAX_CONNECTIONS)
        .max_lifetime(DB_MAX_CONNECTION_LIFETIME)
        .idle_timeout(DB_IDLE_TIMEOUT)
        .connect(&db_url)
        .await?;

    let user_service_addr = env::var("USER_SERVICE_ADDR").ok();
    let user_client = user_service_addr.and_then(|addr| {
        match tonic::transport::Endpoint::from_shared(addr) {
            Ok(endpoint) => {
                let channel = endpoint
                    .tcp_keepalive(Some(GRPC_CLIENT_KEEPALIVE_INTERVAL))
                    .http2_keep_alive_interval(GRPC_CLIENT_KEEPALIVE_INTERVAL)
                    .keep_alive_timeout(GRPC_CLIENT_KEEPALIVE_TIMEOUT)
                    .connect_lazy();
                Some(cogito::user_service_client::UserServiceClient::new(channel))
            }
            Err(e) => {
                tracing::warn!(error = %e, "invalid USER_SERVICE_ADDR, search returns partial results");
                None
            }
        }
    });

    let search = match tokio::time::timeout(
        std::time::Duration::from_secs(SEARCH_CONNECT_TIMEOUT_SECS),
        search::client::SearchClient::new(&search_host, &search_master_key),
    )
    .await
    {
        Ok(Ok(client)) => Some(client),
        Ok(Err(e)) => {
            tracing::warn!(error = %e, "search unavailable at startup, search degraded");
            None
        }
        Err(_) => {
            tracing::warn!("search connection timed out at startup, search degraded");
            None
        }
    };
    let search = Arc::new(tokio::sync::RwLock::new(search));

    let notif_consumer = build_broker_consumer(&broker_addresses, "flowservice-notifications")?;
    let feed_consumer = build_broker_consumer(&broker_addresses, "flowservice-feed")?;

    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
    let notif_progress = Arc::new(ConsumerProgress::new("notifications"));
    let feed_progress = Arc::new(ConsumerProgress::new("feed"));

    let notif_handle = {
        let db = pool.clone();
        let progress = Arc::clone(&notif_progress);
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = notifications::consumer::run(notif_consumer, db, progress, rx).await {
                tracing::error!(error = %e, "notification consumer exited with error");
                std::process::exit(1);
            }
        })
    };
    let feed_handle = {
        let db = pool.clone();
        let progress = Arc::clone(&feed_progress);
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) =
                feed::consumer::run(feed_consumer, db, fan_out_threshold, progress, rx).await
            {
                tracing::error!(error = %e, "feed consumer exited with error");
                std::process::exit(1);
            }
        })
    };
    let consumer_progress_handle = {
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            consumer_health::report_progress(vec![notif_progress, feed_progress], rx).await;
        })
    };
    let cleanup_handle = {
        let db = pool.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            run_cleanup(db, rx).await;
        })
    };
    let search_reconnect_handle = {
        let client = Arc::clone(&search);
        let host = search_host.clone();
        let master_key = search_master_key.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            run_search_reconnect(client, host, master_key, rx).await;
        })
    };

    let search_ctrl = search::controller::SearchController::new(search, user_client);
    let notif_ctrl = notifications::controller::NotificationController::new(pool.clone());

    let shutdown_signal = async move {
        tokio::signal::ctrl_c()
            .await
            .expect("ctrl_c handler failed");
        shutdown_tx.send(true).ok();
        tracing::info!("server shutting down");
    };

    tracing::info!(port = %port, "server starting");

    tonic::transport::Server::builder()
        .add_service(SearchServiceServer::with_interceptor(
            search_ctrl,
            internal_auth::interceptor,
        ))
        .add_service(NotificationServiceServer::with_interceptor(
            notif_ctrl,
            internal_auth::interceptor,
        ))
        .serve_with_shutdown(addr, shutdown_signal)
        .await?;

    // Drain background tasks before closing the pool so in-flight DB writes can finish.
    let (nr, fr, pr, cr, mr) = tokio::join!(
        notif_handle,
        feed_handle,
        consumer_progress_handle,
        cleanup_handle,
        search_reconnect_handle
    );
    if let Err(e) = nr {
        tracing::error!(error = ?e, "notification consumer task failed");
    }
    if let Err(e) = fr {
        tracing::error!(error = ?e, "feed consumer task failed");
    }
    if let Err(e) = pr {
        tracing::error!(error = ?e, "consumer progress task failed");
    }
    if let Err(e) = cr {
        tracing::error!(error = ?e, "cleanup task failed");
    }
    if let Err(e) = mr {
        tracing::error!(error = ?e, "search reconnect task failed");
    }
    pool.close().await;
    Ok(())
}

async fn run_search_reconnect(
    client_slot: Arc<tokio::sync::RwLock<Option<search::client::SearchClient>>>,
    host: String,
    master_key: String,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
    if client_slot.read().await.is_some() {
        return;
    }

    let mut delay = std::time::Duration::from_secs(SEARCH_RECONNECT_INITIAL_SECS);
    loop {
        tokio::select! {
            _ = tokio::time::sleep(delay) => {
                let recovered = match tokio::time::timeout(
                    std::time::Duration::from_secs(SEARCH_CONNECT_TIMEOUT_SECS),
                    search::client::SearchClient::new(&host, &master_key),
                ).await {
                    Ok(Ok(client)) => {
                        Some(client)
                    }
                    Ok(Err(e)) => {
                        tracing::warn!(error = %e, retry_seconds = delay.as_secs(), "search reconnect failed");
                        None
                    }
                    Err(_) => {
                        tracing::warn!(retry_seconds = delay.as_secs(), "search reconnect timed out");
                        None
                    }
                };
                if let Some(client) = recovered {
                    *client_slot.write().await = Some(client);
                    tracing::info!("search recovered");
                    return;
                }
                delay = std::cmp::min(delay * 2, std::time::Duration::from_secs(SEARCH_RECONNECT_MAX_SECS));
            }
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    tracing::info!("search reconnect task shutting down");
                    return;
                }
            }
        }
    }
}

async fn run_cleanup(pool: DatabasePool, mut shutdown_rx: tokio::sync::watch::Receiver<bool>) {
    let delay = std::time::Duration::from_secs(CLEANUP_INTERVAL_SECS);
    let mut interval = tokio::time::interval_at(tokio::time::Instant::now() + delay, delay);
    loop {
        tokio::select! {
            _ = interval.tick() => {
                if let Err(e) = pool.delete_old_outbox().await {
                    tracing::warn!(error = %e, "outbox cleanup failed");
                }
                if let Err(e) = pool.delete_old_feed().await {
                    tracing::warn!(error = %e, "feed cleanup failed");
                }
            }
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    tracing::info!("cleanup task shutting down");
                    break;
                }
            }
        }
    }
}

fn build_broker_consumer(brokers: &str, group_id: &str) -> Result<BrokerConsumer, BrokerError> {
    ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", group_id)
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .create()
}
