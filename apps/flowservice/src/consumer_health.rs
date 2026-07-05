use std::sync::Arc;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const CONSUMER_HEALTH_LOG_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Debug)]
pub struct ConsumerProgress {
    name: &'static str,
    last_partition: AtomicI64,
    last_offset: AtomicI64,
    last_commit_unix_secs: AtomicU64,
}

impl ConsumerProgress {
    pub fn new(name: &'static str) -> Self {
        Self {
            name,
            last_partition: AtomicI64::new(-1),
            last_offset: AtomicI64::new(-1),
            last_commit_unix_secs: AtomicU64::new(0),
        }
    }

    pub fn mark_committed(&self, partition: i32, offset: i64) {
        self.last_partition
            .store(i64::from(partition), Ordering::Relaxed);
        self.last_offset.store(offset, Ordering::Relaxed);
        self.last_commit_unix_secs
            .store(unix_secs_now(), Ordering::Relaxed);
    }

    fn snapshot(&self) -> ConsumerProgressSnapshot {
        ConsumerProgressSnapshot {
            name: self.name,
            last_partition: self.last_partition.load(Ordering::Relaxed),
            last_offset: self.last_offset.load(Ordering::Relaxed),
            last_commit_unix_secs: self.last_commit_unix_secs.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug)]
struct ConsumerProgressSnapshot {
    name: &'static str,
    last_partition: i64,
    last_offset: i64,
    last_commit_unix_secs: u64,
}

pub async fn report_progress(
    progresses: Vec<Arc<ConsumerProgress>>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
    let mut interval = tokio::time::interval(CONSUMER_HEALTH_LOG_INTERVAL);
    loop {
        tokio::select! {
            _ = interval.tick() => {
                for progress in &progresses {
                    let snapshot = progress.snapshot();
                    tracing::info!(
                        consumer = snapshot.name,
                        partition = snapshot.last_partition,
                        offset = snapshot.last_offset,
                        seconds_since_commit = seconds_since(snapshot.last_commit_unix_secs),
                        "consumer progress"
                    );
                }
            }
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    tracing::info!("consumer progress reporter shutting down");
                    return;
                }
            }
        }
    }
}

fn seconds_since(unix_secs: u64) -> Option<u64> {
    if unix_secs == 0 {
        return None;
    }
    Some(unix_secs_now().saturating_sub(unix_secs))
}

fn unix_secs_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
