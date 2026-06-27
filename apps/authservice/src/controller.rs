use argon2::{Argon2, Params, PasswordHash, PasswordVerifier};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, KeyInit, Mac};
use rand::RngCore;
use sha2::Sha256;
use std::sync::{Arc, OnceLock};
use tokio::sync::Semaphore;
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

use crate::cogito::auth_service_server::AuthService;
use crate::cogito::{Credentials, Empty, Session, SessionRequest, Sessions, UserRequest};

#[tonic::async_trait]
pub trait AuthDb: Send + Sync + 'static {
    async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error>;
    async fn create_session(&self, session_id: &str, user_id: i32) -> Result<Session, sqlx::Error>;
    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, sqlx::Error>;
    async fn get_sessions(&self, user_id: i32) -> Result<Vec<Session>, sqlx::Error>;
    async fn delete_session(&self, session_id: &str) -> Result<u64, sqlx::Error>;
    async fn update_password_hash(&self, user_id: i32, new_hash: &str) -> Result<(), sqlx::Error>;
}

pub struct Controller<D: AuthDb> {
    db_client: D,
    session_hmac_secret: String,
    semaphore: Arc<Semaphore>,
}

impl<D: AuthDb + Clone> Controller<D> {
    pub fn new(db_client: D, session_hmac_secret: String, semaphore: Arc<Semaphore>) -> Self {
        Self {
            db_client,
            session_hmac_secret,
            semaphore,
        }
    }
}

#[tonic::async_trait]
impl<D: AuthDb + Clone> AuthService for Controller<D> {
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
            tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/CreateSession", error = %e, "getting user failed");
            Status::internal("Internal server error.")
        })?;

        let _permit = self
            .semaphore
            .try_acquire()
            .map_err(|_| Status::resource_exhausted("Server busy, retry later."))?;

        match user_opt {
            Some((user_id, password_hash)) => {
                let parsed_hash = PasswordHash::new(&password_hash);
                let is_valid = parsed_hash
                    .as_ref()
                    .map(|h| {
                        Argon2::default()
                            .verify_password(req.password.as_bytes(), h)
                            .is_ok()
                    })
                    .unwrap_or(false);
                if !is_valid {
                    return Err(Status::unauthenticated("Incorrect email or password."));
                }

                if let Ok(parsed) = &parsed_hash
                    && let Ok(stored) = Params::try_from(parsed)
                {
                    let defaults = Params::default();
                    if stored.m_cost() < defaults.m_cost()
                        || stored.t_cost() < defaults.t_cost()
                        || stored.p_cost() < defaults.p_cost()
                    {
                        let db = self.db_client.clone();
                        let sem = Arc::clone(&self.semaphore);
                        let password_bytes = req.password.as_bytes().to_vec();
                        tokio::spawn(async move {
                            if let Ok(_permit) = sem.try_acquire() {
                                use argon2::password_hash::{
                                    PasswordHasher, SaltString, rand_core::OsRng,
                                };
                                let salt = SaltString::generate(&mut OsRng);
                                match Argon2::default().hash_password(&password_bytes, &salt) {
                                    Ok(new_hash) => {
                                        if let Err(e) = db
                                            .update_password_hash(user_id, &new_hash.to_string())
                                            .await
                                        {
                                            tracing::warn!(error = %e, "lazy password upgrade failed");
                                        }
                                    }
                                    Err(e) => {
                                        tracing::warn!(error = %e, "lazy password re-hash failed")
                                    }
                                }
                            }
                        });
                    }
                }

                drop(_permit);

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
                        tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/CreateSession", error = %e, "creating session failed");
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
            tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/GetSession", error = %e, "getting session failed");
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
                tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/GetSessions", error = %e, "getting sessions failed");
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

        match self.db_client.delete_session(&hashed_id).await {
            Ok(n) if n > 0 => Ok(Response::new(Empty {})),
            Ok(_) => match self.db_client.delete_session(&req.session_id).await {
                Ok(_) => Ok(Response::new(Empty {})),
                Err(e) => {
                    tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/DeleteSession", error = %e, "deleting session failed");
                    Err(Status::internal("Internal server error."))
                }
            },
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.AuthService/DeleteSession", error = %e, "deleting session failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use argon2::{
        Algorithm, Argon2, Params, Version,
        password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
    };
    use std::sync::Arc;

    #[derive(Clone)]
    struct MockAuthDb;

    #[tonic::async_trait]
    impl AuthDb for MockAuthDb {
        async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error> {
            if email == "test@example.com" {
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

        async fn delete_session(&self, _session_id: &str) -> Result<u64, sqlx::Error> {
            Ok(0)
        }

        async fn update_password_hash(
            &self,
            _user_id: i32,
            _new_hash: &str,
        ) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    fn make_semaphore(permits: usize) -> Arc<Semaphore> {
        Arc::new(Semaphore::new(permits))
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
        let req = Request::new(Credentials {
            email: "db_error@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);
    }

    #[tokio::test]
    async fn test_create_session_semaphore_exhausted() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(0));
        let req = Request::new(Credentials {
            email: "test@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::ResourceExhausted);
    }

    #[tokio::test]
    async fn test_get_session_success() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
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
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
        let req = Request::new(SessionRequest {
            session_id: "unknown_session".to_string(),
        });
        let res = controller.get_session(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Unauthenticated);
    }

    #[tokio::test]
    async fn test_get_sessions() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
        let req = Request::new(UserRequest { user_id: 1 });
        let res = controller.get_sessions(req).await;
        assert!(res.is_ok());
        let sessions = res.unwrap().into_inner().sessions;
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].id, "valid_session");
    }

    #[tokio::test]
    async fn test_delete_session() {
        let controller = Controller::new(MockAuthDb, "test-secret".to_string(), make_semaphore(8));
        let req = Request::new(SessionRequest {
            session_id: "valid_session".to_string(),
        });
        let res = controller.delete_session(req).await;
        assert!(res.is_ok());
    }

    #[tokio::test]
    async fn test_create_session_triggers_upgrade() {
        use tokio::sync::Notify;
        use tokio::time::{Duration, timeout};

        #[derive(Clone)]
        struct UpgradeMockDb {
            notify: Arc<Notify>,
        }

        #[tonic::async_trait]
        impl AuthDb for UpgradeMockDb {
            async fn get_user(&self, email: &str) -> Result<Option<(i32, String)>, sqlx::Error> {
                if email == "test@example.com" {
                    let salt = SaltString::generate(&mut OsRng);
                    let weak_argon = Argon2::new(
                        Algorithm::Argon2id,
                        Version::V0x13,
                        Params::new(1024, 1, 1, None).unwrap(),
                    );
                    let hash = weak_argon
                        .hash_password(b"password", &salt)
                        .unwrap()
                        .to_string();
                    Ok(Some((1, hash)))
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

            async fn get_session(&self, _session_id: &str) -> Result<Option<Session>, sqlx::Error> {
                Ok(None)
            }

            async fn get_sessions(&self, _user_id: i32) -> Result<Vec<Session>, sqlx::Error> {
                Ok(vec![])
            }

            async fn delete_session(&self, _session_id: &str) -> Result<u64, sqlx::Error> {
                Ok(0)
            }

            async fn update_password_hash(
                &self,
                _user_id: i32,
                _new_hash: &str,
            ) -> Result<(), sqlx::Error> {
                self.notify.notify_one();
                Ok(())
            }
        }

        let notify = Arc::new(Notify::new());
        let db = UpgradeMockDb {
            notify: Arc::clone(&notify),
        };
        let controller = Controller::new(db, "test-secret".to_string(), make_semaphore(8));
        let req = Request::new(Credentials {
            email: "test@example.com".to_string(),
            password: "password".to_string(),
        });
        let res = controller.create_session(req).await;
        assert!(res.is_ok());

        timeout(Duration::from_secs(2), notify.notified())
            .await
            .expect("update_password_hash should be called within 2 seconds");
    }
}
