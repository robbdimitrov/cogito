use argon2::{Argon2, PasswordHash, PasswordVerifier};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, KeyInit, Mac};
use rand::RngCore;
use sha2::Sha256;
use std::sync::OnceLock;
use tonic::{Request, Response, Status};

type HmacSha256 = Hmac<Sha256>;

// A precomputed Argon2 hash used to equalize verification time when an email is
// not found, so response timing does not reveal whether an account exists.
fn dummy_password_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();
    HASH.get_or_init(|| {
        use argon2::password_hash::{PasswordHasher, SaltString, rand_core::OsRng};
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(b"timing-equalizer", &salt)
            .expect("Argon2 timing-equalizer hash must succeed")
            .to_string()
    })
}

fn hash_session_id(secret: &str, session_id: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(session_id.as_bytes());
    URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
}

use crate::thoughts::auth_service_server::AuthService;
use crate::thoughts::{Credentials, Empty, Session, SessionRequest, Sessions, UserRequest};

#[tonic::async_trait]
pub trait AuthDb: Send + Sync + 'static {
    async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error>;
    async fn create_session(&self, session_id: &str, user_id: i32) -> Result<Session, sqlx::Error>;
    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, sqlx::Error>;
    async fn get_sessions(&self, user_id: i32) -> Result<Vec<Session>, sqlx::Error>;
    async fn delete_session(&self, session_id: &str) -> Result<(), sqlx::Error>;
}

pub struct Controller<D: AuthDb> {
    db_client: D,
    session_hmac_secret: String,
}

impl<D: AuthDb> Controller<D> {
    pub fn new(db_client: D, session_hmac_secret: String) -> Self {
        Self {
            db_client,
            session_hmac_secret,
        }
    }
}

#[tonic::async_trait]
impl<D: AuthDb> AuthService for Controller<D> {
    async fn create_session(
        &self,
        request: Request<Credentials>,
    ) -> Result<Response<Session>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        if req.email.is_empty() || req.password.is_empty() {
            return Err(Status::invalid_argument("Missing credentials."));
        }

        let user_opt = self.db_client.get_user(&req.email).await.map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/thoughts.AuthService/CreateSession", error = %e, "getting user failed");
            Status::internal("Internal server error.")
        })?;

        match user_opt {
            Some((user_id, password_hash)) => {
                let is_valid = PasswordHash::new(&password_hash)
                    .map(|parsed_hash| {
                        Argon2::default()
                            .verify_password(req.password.as_bytes(), &parsed_hash)
                            .is_ok()
                    })
                    .unwrap_or(false);
                if !is_valid {
                    return Err(Status::unauthenticated("Incorrect email or password."));
                }

                // Generate a 21-byte token and encode it as URL-safe base64 (28 characters)
                let mut key = [0u8; 21];
                rand::thread_rng().fill_bytes(&mut key);
                let session_id = URL_SAFE_NO_PAD.encode(key);

                let hashed_id = hash_session_id(&self.session_hmac_secret, &session_id);

                let mut session = self
                    .db_client
                    .create_session(&hashed_id, user_id)
                    .await
                    .map_err(|e| {
                        tracing::warn!(request_id = %request_id, method = "/thoughts.AuthService/CreateSession", error = %e, "creating session failed");
                        Status::internal("Internal server error.")
                    })?;

                session.id = session_id;
                Ok(Response::new(session))
            }
            None => {
                // Verify against a dummy hash so the not-found path costs the
                // same as a wrong-password verification (prevents user enumeration).
                if let Ok(parsed_hash) = PasswordHash::new(dummy_password_hash()) {
                    let _ =
                        Argon2::default().verify_password(req.password.as_bytes(), &parsed_hash);
                }
                Err(Status::unauthenticated("Incorrect email or password."))
            }
        }
    }

    async fn get_session(
        &self,
        request: Request<SessionRequest>,
    ) -> Result<Response<Session>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        let hashed_id = hash_session_id(&self.session_hmac_secret, &req.session_id);

        let session_opt = self.db_client.get_session(&hashed_id).await.map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/thoughts.AuthService/GetSession", error = %e, "getting session failed");
            Status::internal("Internal server error.")
        })?;

        match session_opt {
            Some(mut session) => {
                session.id = req.session_id;
                Ok(Response::new(session))
            }
            None => Err(Status::unauthenticated("Session not found.")),
        }
    }

    async fn get_sessions(
        &self,
        request: Request<UserRequest>,
    ) -> Result<Response<Sessions>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        let sessions_list = self
            .db_client
            .get_sessions(req.user_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/thoughts.AuthService/GetSessions", error = %e, "getting sessions failed");
                Status::internal("Internal server error.")
            })?;

        Ok(Response::new(Sessions {
            sessions: sessions_list,
        }))
    }

    async fn delete_session(
        &self,
        request: Request<SessionRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        let hashed_id = hash_session_id(&self.session_hmac_secret, &req.session_id);

        let res1 = self.db_client.delete_session(&hashed_id).await;
        let res2 = self.db_client.delete_session(&req.session_id).await;

        if res1.is_err() && res2.is_err() {
            tracing::warn!(request_id = %request_id, method = "/thoughts.AuthService/DeleteSession", "deleting session failed");
            return Err(Status::internal("Internal server error."));
        }

        Ok(Response::new(Empty {}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use argon2::{
        Argon2,
        password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
    };

    struct MockAuthDb;

    #[tonic::async_trait]
    impl AuthDb for MockAuthDb {
        async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error> {
            if email == "test@example.com" {
                // "password" hashed
                let salt = SaltString::generate(&mut OsRng);
                let hash = Argon2::default()
                    .hash_password("password".as_bytes(), &salt)
                    .unwrap()
                    .to_string();
                Ok(Some((1, hash)))
            } else if email == "db_error@example.com" {
                Err(sqlx::Error::RowNotFound)
            } else {
                Ok(None)
            }
        }

        async fn create_session(
            &self,
            session_id: &str,
            user_id: i32,
        ) -> Result<Session, sqlx::Error> {
            Ok(Session {
                id: session_id.to_string(),
                user_id,
                created: "2026-06-02T00:00:00Z".to_string(),
            })
        }

        async fn get_session(&self, session_id: &str) -> Result<Option<Session>, sqlx::Error> {
            let expected_hashed_id = hash_session_id("test-secret", "valid_session");

            if session_id == expected_hashed_id {
                Ok(Some(Session {
                    id: session_id.to_string(),
                    user_id: 1,
                    created: "2026-06-02T00:00:00Z".to_string(),
                }))
            } else {
                Ok(None)
            }
        }

        async fn get_sessions(&self, user_id: i32) -> Result<Vec<Session>, sqlx::Error> {
            if user_id == 1 {
                Ok(vec![Session {
                    id: "valid_session".to_string(),
                    user_id,
                    created: "2026-06-02T00:00:00Z".to_string(),
                }])
            } else {
                Ok(vec![])
            }
        }

        async fn delete_session(&self, _session_id: &str) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    #[test]
    fn test_token_generation() {
        let mut key = [0u8; 21];
        rand::thread_rng().fill_bytes(&mut key);
        let id = URL_SAFE_NO_PAD.encode(key);
        // Base64 encoding of 21 bytes without padding results in 28 characters
        assert_eq!(id.len(), 28);
    }

    #[tokio::test]
    async fn test_create_session_success() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(Credentials {
            email: "test@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_ok());
        let session = res.unwrap().into_inner();
        assert_eq!(session.user_id, 1);
        assert_eq!(session.id.len(), 28);
    }

    #[tokio::test]
    async fn test_create_session_missing_credentials() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(Credentials {
            email: "".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::InvalidArgument);
    }

    #[tokio::test]
    async fn test_create_session_incorrect_password() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(Credentials {
            email: "test@example.com".to_string(),
            password: "wrong".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Unauthenticated);
    }

    #[tokio::test]
    async fn test_create_session_user_not_found() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(Credentials {
            email: "unknown@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Unauthenticated);
    }

    #[tokio::test]
    async fn test_create_session_db_error() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(Credentials {
            email: "db_error@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);
    }

    #[tokio::test]
    async fn test_get_session_success() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(SessionRequest {
            session_id: "valid_session".to_string(),
        });
        let res = controller.get_session(req).await;
        assert!(res.is_ok());
        let session = res.unwrap().into_inner();
        assert_eq!(session.id, "valid_session");
    }

    #[tokio::test]
    async fn test_get_session_not_found() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(SessionRequest {
            session_id: "unknown_session".to_string(),
        });
        let res = controller.get_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Unauthenticated);
    }

    #[tokio::test]
    async fn test_get_sessions() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(UserRequest { user_id: 1 });
        let res = controller.get_sessions(req).await;
        assert!(res.is_ok());
        let sessions = res.unwrap().into_inner().sessions;
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].id, "valid_session");
    }

    #[tokio::test]
    async fn test_delete_session() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string());
        let req = Request::new(SessionRequest {
            session_id: "valid_session".to_string(),
        });
        let res = controller.delete_session(req).await;
        assert!(res.is_ok());
    }
}
