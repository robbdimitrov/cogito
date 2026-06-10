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
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if provided.as_bytes().ct_eq(expected.as_bytes()).into() {
        Ok(req)
    } else {
        Err(Status::unauthenticated("Unauthenticated."))
    }
}

fn internal_grpc_token() -> String {
    match env::var("INTERNAL_GRPC_TOKEN") {
        Ok(v) if !v.is_empty() => v,
        _ => DEFAULT_INTERNAL_GRPC_TOKEN.to_string(),
    }
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
