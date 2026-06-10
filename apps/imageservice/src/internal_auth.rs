use std::env;
use subtle::ConstantTimeEq;
use tonic::{Request, Status};

const DEFAULT_INTERNAL_GRPC_TOKEN: &str = "dev-internal-grpc-token";

#[allow(clippy::result_large_err)]
pub fn interceptor(req: Request<()>) -> Result<Request<()>, Status> {
    let expected = internal_grpc_token();
    authenticate(req, &expected)
}

#[allow(clippy::result_large_err)]
fn authenticate(req: Request<()>, expected: &str) -> Result<Request<()>, Status> {
    let provided = req
        .metadata()
        .get("internal-token")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if token_matches(provided, expected) {
        Ok(req)
    } else {
        Err(Status::unauthenticated("Unauthenticated."))
    }
}

/// Constant-time comparison of a provided token against the expected secret.
pub fn token_matches(provided: &str, expected: &str) -> bool {
    provided.as_bytes().ct_eq(expected.as_bytes()).into()
}

pub fn internal_grpc_token() -> String {
    env::var("INTERNAL_GRPC_TOKEN").unwrap_or_else(|_| DEFAULT_INTERNAL_GRPC_TOKEN.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_internal_token() {
        let result = authenticate(Request::new(()), "test-token");

        assert!(result.is_err());
    }

    #[test]
    fn accepts_matching_internal_token() {
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("internal-token", "test-token".parse().unwrap());

        let result = authenticate(req, "test-token");

        assert!(result.is_ok());
    }
}
