#[allow(clippy::all)]
#[rustfmt::skip]
pub mod cogito;

mod feed;
mod internal_auth;
mod logging;
mod notifications;
mod search;

use std::env;

use cogito::notification_service_server::NotificationServiceServer;
use cogito::search_service_server::SearchServiceServer;
use feed::db::FeedDb;
use fred::interfaces::ClientLike;
use rdkafka::ClientConfig;
use rdkafka::consumer::StreamConsumer;
use rdkafka::error::KafkaError;

const DEFAULT_FAN_OUT_THRESHOLD: i32 = 10_000;
const CLEANUP_INTERVAL_SECS: u64 = 3600;
const MEILI_CONNECT_TIMEOUT_SECS: u64 = 5;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    logging::init();
    internal_auth::init();

    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let kafka_brokers =
        env::var("REDPANDA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let valkey_url =
        env::var("VALKEY_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let meili_host = env::var("MEILI_HOST").expect("MEILI_HOST must be set");
    let meili_master_key = env::var("MEILI_MASTER_KEY").expect("MEILI_MASTER_KEY must be set");
    let fan_out_threshold = env::var("FAN_OUT_THRESHOLD")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_FAN_OUT_THRESHOLD);

    let addr = format!("0.0.0.0:{}", port).parse()?;

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&db_url)
        .await?;

    let user_service_addr = env::var("USER_SERVICE_ADDR").ok();
    let user_client = user_service_addr.and_then(|addr| {
        match tonic::transport::Endpoint::from_shared(addr) {
            Ok(endpoint) => {
                let channel = endpoint.connect_lazy();
                Some(cogito::user_service_client::UserServiceClient::new(channel))
            }
            Err(e) => {
                tracing::warn!(error = %e, "invalid USER_SERVICE_ADDR, search returns partial results");
                None
            }
        }
    });

    let meili = match tokio::time::timeout(
        std::time::Duration::from_secs(MEILI_CONNECT_TIMEOUT_SECS),
        search::meili::MeiliClient::new(&meili_host, &meili_master_key),
    )
    .await
    {
        Ok(Ok(client)) => Some(client),
        Ok(Err(e)) => {
            tracing::warn!(error = %e, "meilisearch unavailable at startup, search degraded");
            None
        }
        Err(_) => {
            tracing::warn!("meilisearch connection timed out at startup, search degraded");
            None
        }
    };

    let valkey_config = fred::prelude::RedisConfig::from_url(&valkey_url)?;
    let valkey_client = fred::prelude::RedisClient::new(valkey_config, None, None, None);
    let _valkey_conn = valkey_client.connect(); // detached; errors surface via get/set failures
    valkey_client.wait_for_connect().await?;
    let follower_cache = feed::cache::FollowerCache::new(valkey_client);

    let notif_consumer = build_kafka_consumer(&kafka_brokers, "flowservice-notifications")?;
    let feed_consumer = build_kafka_consumer(&kafka_brokers, "flowservice-feed")?;

    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    let notif_handle = {
        let db = pool.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = notifications::consumer::run(notif_consumer, db, rx).await {
                tracing::error!(error = %e, "notification consumer exited with error");
                std::process::exit(1);
            }
        })
    };
    let feed_handle = {
        let db = pool.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = feed::consumer::run(feed_consumer, db, follower_cache, fan_out_threshold, rx).await {
                tracing::error!(error = %e, "feed consumer exited with error");
                std::process::exit(1);
            }
        })
    };
    let cleanup_handle = {
        let db = pool.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            run_cleanup(db, rx).await;
        })
    };

    let search_ctrl = search::controller::SearchController::new(meili, user_client);
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
    let (nr, fr, cr) = tokio::join!(notif_handle, feed_handle, cleanup_handle);
    if let Err(e) = nr {
        tracing::error!(error = ?e, "notification consumer task failed");
    }
    if let Err(e) = fr {
        tracing::error!(error = ?e, "feed consumer task failed");
    }
    if let Err(e) = cr {
        tracing::error!(error = ?e, "cleanup task failed");
    }
    pool.close().await;
    Ok(())
}

async fn run_cleanup(pool: sqlx::PgPool, mut shutdown_rx: tokio::sync::watch::Receiver<bool>) {
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

fn build_kafka_consumer(brokers: &str, group_id: &str) -> Result<StreamConsumer, KafkaError> {
    ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", group_id)
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .create()
}
