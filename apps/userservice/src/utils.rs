use regex::Regex;
use tonic::{Request, Status};

pub fn is_valid_email(email: &str) -> bool {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"^[^@]+@[^@]+\.[^@]+$").unwrap());
    re.is_match(email)
}

// tonic::Status is mandated by the gRPC handler signatures that call this;
// boxing it isn't practical here.
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

// Returns None for an anonymous caller rather than a 0 sentinel: 0 is a
// valid-looking i32 that an equality check like `follower_id = $1` could
// accidentally match if the users id sequence were ever reset or seeded to
// start at 0. Callers must bind this as a nullable query parameter.
pub fn optional_user_id<T>(req: &Request<T>) -> Option<i32> {
    get_user_id(req).ok()
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
