use std::env;
use std::sync::OnceLock;
use subtle::{Choice, ConstantTimeEq};
use tonic::{Request, Status};

static TOKEN: OnceLock<String> = OnceLock::new();

pub fn init() {
    TOKEN.get_or_init(|| {
        let v = env::var("INTERNAL_GRPC_TOKEN").expect("INTERNAL_GRPC_TOKEN must be set");
        assert!(!v.is_empty(), "INTERNAL_GRPC_TOKEN must not be empty");
        v
    });
}

// tonic::Status is mandated by the gRPC interceptor signature; boxing it
// isn't practical here.
#[allow(clippy::result_large_err)]
pub fn interceptor(req: Request<()>) -> Result<Request<()>, Status> {
    let expected = internal_grpc_token();
    authenticate(req, expected)
}

// tonic::Status is mandated by the gRPC interceptor signature; boxing it
// isn't practical here.
#[allow(clippy::result_large_err)]
fn authenticate(req: Request<()>, expected: &str) -> Result<Request<()>, Status> {
    let provided = req
        .metadata()
        .get("internal-token")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if ct_eq_str(provided, expected) {
        Ok(req)
    } else {
        Err(Status::unauthenticated("Unauthenticated."))
    }
}

fn ct_eq_str(a: &str, b: &str) -> bool {
    let a = a.as_bytes();
    let b = b.as_bytes();
    let max_len = a.len().max(b.len());
    let mut a_buf = vec![0u8; max_len];
    let mut b_buf = vec![0u8; max_len];
    a_buf[..a.len()].copy_from_slice(a);
    b_buf[..b.len()].copy_from_slice(b);
    let len_eq: Choice = (a.len() as u64).ct_eq(&(b.len() as u64));
    let bytes_eq: Choice = a_buf.ct_eq(&b_buf);
    (len_eq & bytes_eq).into()
}

pub fn token() -> &'static str {
    internal_grpc_token()
}

fn internal_grpc_token() -> &'static str {
    TOKEN
        .get()
        .expect("internal_auth::init() must be called before serving requests")
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
    fn rejects_token_with_correct_prefix_wrong_length() {
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("internal-token", "test-token-extra".parse().unwrap());
        let result = authenticate(req, "test-token");
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
