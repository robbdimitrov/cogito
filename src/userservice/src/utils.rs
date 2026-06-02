use regex::Regex;
use tonic::{Request, Status};

pub fn is_valid_email(email: &str) -> bool {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"^[^@]+@[^@]+\.[^@]+$").unwrap());
    re.is_match(email)
}

pub fn get_user_id<T>(req: &Request<T>) -> Result<i32, Status> {
    match req.metadata().get("user-id") {
        Some(token) => {
            let id_str = token.to_str().map_err(|_| Status::unauthenticated("Unauthenticated."))?;
            id_str.parse::<i32>().map_err(|_| Status::unauthenticated("Unauthenticated."))
        },
        None => Err(Status::unauthenticated("Unauthenticated.")),
    }
}
