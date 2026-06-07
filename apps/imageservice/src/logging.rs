use axum::http::HeaderMap;
use tonic::Request;

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

pub fn grpc_request_id<T>(request: &Request<T>) -> &str {
    request
        .metadata()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
}

pub fn http_request_id(headers: &HeaderMap) -> &str {
    headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
}
