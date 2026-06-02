use bcrypt::verify;
use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::db_client::DbClient;
use crate::thoughts::auth_service_server::AuthService;
use crate::thoughts::{Credentials, Empty, Session, SessionRequest, Sessions, UserRequest};

pub struct Controller {
    db_client: DbClient,
}

impl Controller {
    pub fn new(db_client: DbClient) -> Self {
        Self { db_client }
    }
}

#[tonic::async_trait]
impl AuthService for Controller {
    async fn create_session(
        &self,
        request: Request<Credentials>,
    ) -> Result<Response<Session>, Status> {
        let req = request.into_inner();
        if req.email.is_empty() || req.password.is_empty() {
            return Err(Status::invalid_argument("Missing credentials."));
        }

        let user_opt = self.db_client.get_user(&req.email).await.map_err(|e| {
            eprintln!("Getting user failed: {}", e);
            Status::internal("Internal server error.")
        })?;

        match user_opt {
            Some((user_id, password_hash)) => {
                let is_valid = verify(&req.password, &password_hash).unwrap_or(false);
                if !is_valid {
                    return Err(Status::unauthenticated("Incorrect email or password."));
                }

                // Instead of secrets.token_urlsafe(21), we use a UUID v4
                let session_id = Uuid::new_v4().to_string();
                let session = self.db_client.create_session(&session_id, user_id).await.map_err(|e| {
                    eprintln!("Creating session failed: {}", e);
                    Status::internal("Internal server error.")
                })?;

                Ok(Response::new(session))
            }
            None => Err(Status::unauthenticated("Incorrect email or password.")),
        }
    }

    async fn get_session(
        &self,
        request: Request<SessionRequest>,
    ) -> Result<Response<Session>, Status> {
        let req = request.into_inner();
        let session_opt = self.db_client.get_session(&req.session_id).await.map_err(|e| {
            eprintln!("Getting session failed: {}", e);
            Status::internal("Internal server error.")
        })?;

        match session_opt {
            Some(session) => Ok(Response::new(session)),
            None => Err(Status::unauthenticated("Session not found.")),
        }
    }

    async fn get_sessions(
        &self,
        request: Request<UserRequest>,
    ) -> Result<Response<Sessions>, Status> {
        let req = request.into_inner();
        let sessions_list = self.db_client.get_sessions(req.user_id).await.map_err(|e| {
            eprintln!("Getting sessions failed: {}", e);
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
        let req = request.into_inner();
        self.db_client.delete_session(&req.session_id).await.map_err(|e| {
            eprintln!("Deleting session failed: {}", e);
            Status::internal("Internal server error.")
        })?;

        Ok(Response::new(Empty {}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uuid_generation() {
        let id = Uuid::new_v4().to_string();
        // UUID should be 36 characters long including hyphens
        assert_eq!(id.len(), 36);
    }
}
