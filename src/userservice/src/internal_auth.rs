use std::env;
use tonic::{Request, Status};

const DEFAULT_INTERNAL_GRPC_TOKEN: &str = "dev-internal-grpc-token";

#[allow(clippy::result_large_err)]
pub fn interceptor(req: Request<()>) -> Result<Request<()>, Status> {
    let expected = internal_grpc_token();
    let provided = req
        .metadata()
        .get("internal-token")
        .and_then(|value| value.to_str().ok());

    if provided == Some(expected.as_str()) {
        Ok(req)
    } else {
        Err(Status::unauthenticated("Unauthenticated."))
    }
}

fn internal_grpc_token() -> String {
    env::var("INTERNAL_GRPC_TOKEN").unwrap_or_else(|_| DEFAULT_INTERNAL_GRPC_TOKEN.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    #[test]
    fn rejects_missing_internal_token() {
        let _guard = ENV_MUTEX.lock().unwrap();
        env::set_var("INTERNAL_GRPC_TOKEN", "test-token");

        let result = interceptor(Request::new(()));

        assert!(result.is_err());
        env::remove_var("INTERNAL_GRPC_TOKEN");
    }

    #[test]
    fn accepts_matching_internal_token() {
        let _guard = ENV_MUTEX.lock().unwrap();
        env::set_var("INTERNAL_GRPC_TOKEN", "test-token");
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("internal-token", "test-token".parse().unwrap());

        let result = interceptor(req);

        assert!(result.is_ok());
        env::remove_var("INTERNAL_GRPC_TOKEN");
    }
}
