use regex::Regex;
use tonic::{Request, Status};

pub fn is_valid_email(email: &str) -> bool {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"^[^@]+@[^@]+\.[^@]+$").unwrap());
    re.is_match(email)
}

#[allow(clippy::result_large_err)]
pub fn get_user_id<T>(req: &Request<T>) -> Result<i32, Status> {
    match req.metadata().get("user-id") {
        Some(token) => {
            let id_str = token
                .to_str()
                .map_err(|_| Status::unauthenticated("Unauthenticated."))?;
            id_str
                .parse::<i32>()
                .map_err(|_| Status::unauthenticated("Unauthenticated."))
        }
        None => Err(Status::unauthenticated("Unauthenticated.")),
    }
}

pub fn optional_user_id<T>(req: &Request<T>) -> i32 {
    get_user_id(req).unwrap_or(0)
}

pub fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        db_err.is_unique_violation()
    } else {
        false
    }
}

pub fn is_foreign_key_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        db_err.is_foreign_key_violation()
    } else {
        false
    }
}
