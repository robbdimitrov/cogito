use tonic::{Request, Status};

/// Derives the acting user ID from the `user-id` gRPC metadata header set by
/// the gateway after validating the session. Never trust a client-supplied
/// user ID field in the request body for identity.
#[allow(clippy::result_large_err)]
pub fn get_user_id<T>(req: &Request<T>) -> Result<i32, Status> {
    match req.metadata().get("user-id") {
        Some(value) => {
            let id_str = value
                .to_str()
                .map_err(|_| Status::unauthenticated("Unauthenticated."))?;
            id_str
                .parse::<i32>()
                .map_err(|_| Status::unauthenticated("Unauthenticated."))
        }
        None => Err(Status::unauthenticated("Unauthenticated.")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_user_id_metadata() {
        let req = Request::new(());
        assert_eq!(
            get_user_id(&req).unwrap_err().code(),
            tonic::Code::Unauthenticated
        );
    }

    #[test]
    fn rejects_non_numeric_user_id_metadata() {
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("user-id", "not-a-number".parse().unwrap());
        assert_eq!(
            get_user_id(&req).unwrap_err().code(),
            tonic::Code::Unauthenticated
        );
    }

    #[test]
    fn parses_valid_user_id_metadata() {
        let mut req = Request::new(());
        req.metadata_mut().insert("user-id", "42".parse().unwrap());
        assert_eq!(get_user_id(&req).unwrap(), 42);
    }
}
