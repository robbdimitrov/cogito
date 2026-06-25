pub fn init() {
    let level = match std::env::var("LOG_LEVEL").as_deref() {
        Ok("debug") => tracing::Level::DEBUG,
        _ => tracing::Level::INFO,
    };
    let _ = tracing_subscriber::fmt()
        .json()
        .flatten_event(true)
        .with_max_level(level)
        .try_init();
}
