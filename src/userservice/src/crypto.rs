use bcrypt::{hash, verify, DEFAULT_COST};

pub fn generate_hash(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

pub fn validate_password(password: &str, hash_str: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(password, hash_str)
}
