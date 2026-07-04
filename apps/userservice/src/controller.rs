use crate::cogito::user_service_server::UserService;
use crate::cogito::{
    CreateUserRequest, Empty, GetUserByUsernameRequest, GetUsersRequest, Identifier, Ids,
    SearchUsersRequest, UpdateUserRequest, User, UserRequest, Users,
};
use crate::crypto::{generate_hash, validate_password};
use crate::pagination;
use crate::utils::{get_user_id, is_valid_email, optional_user_id};
use chrono::{DateTime, Utc};
use sqlx::Error as SqlxError;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tonic::{Request, Response, Status};

const DEFAULT_ARGON_MAX_CONCURRENCY: usize = 4;

pub struct UpdateUserFields<'a> {
    pub name: &'a str,
    pub username: &'a str,
    pub email: &'a str,
    pub bio: &'a str,
    pub profile_photo_key: Option<&'a str>,
    pub cover_photo_key: Option<&'a str>,
}

#[tonic::async_trait]
pub trait UserDb: Send + Sync + 'static {
    async fn create_user(
        &self,
        name: &str,
        username: &str,
        email: &str,
        password_hash: &str,
    ) -> Result<i32, SqlxError>;
    async fn get_user_with_id(&self, user_id: i32) -> Result<Option<(i32, String)>, SqlxError>;
    async fn get_user(&self, user_id: i32, current_user_id: i32)
    -> Result<Option<User>, SqlxError>;
    async fn get_user_by_username(
        &self,
        username: &str,
        current_user_id: i32,
    ) -> Result<Option<User>, SqlxError>;
    async fn get_users_by_ids(&self, ids: &[i32]) -> Result<Vec<User>, SqlxError>;
    async fn update_user(
        &self,
        user_id: i32,
        fields: UpdateUserFields<'_>,
    ) -> Result<(), SqlxError>;
    async fn update_password(&self, user_id: i32, password_hash: &str) -> Result<(), SqlxError>;
    async fn get_following(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError>;
    async fn get_followers(
        &self,
        user_id: i32,
        cursor: &str,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError>;
    async fn follow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError>;
    async fn unfollow_user(&self, user_id: i32, follower_id: i32) -> Result<(), SqlxError>;
    async fn search_users(
        &self,
        query: &str,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<User>, SqlxError>;
}

pub struct Controller<D: UserDb> {
    pub db_client: D,
    semaphore: Arc<Semaphore>,
}

impl<D: UserDb> Controller<D> {
    pub fn new(db_client: D) -> Self {
        Self::with_semaphore(
            db_client,
            Arc::new(Semaphore::new(DEFAULT_ARGON_MAX_CONCURRENCY)),
        )
    }

    pub fn with_semaphore(db_client: D, semaphore: Arc<Semaphore>) -> Self {
        Self {
            db_client,
            semaphore,
        }
    }
}

fn is_valid_username(username: &str) -> bool {
    !username.is_empty()
        && username.len() <= 255
        && username
            .bytes()
            .all(|character| character.is_ascii_alphanumeric() || character == b'_')
}

#[tonic::async_trait]
impl<D: UserDb> UserService for Controller<D> {
    async fn create_user(
        &self,
        request: Request<CreateUserRequest>,
    ) -> Result<Response<Identifier>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        let name = req.name.trim();
        let username = req.username.trim().to_lowercase();
        let email = req.email.trim().to_lowercase();
        let password = req.password.as_str();

        if name.is_empty() || username.is_empty() || email.is_empty() || password.is_empty() {
            return Err(Status::invalid_argument(
                "Name, username, email and password are required.",
            ));
        } else if !is_valid_username(&username) {
            return Err(Status::invalid_argument(
                "Username may contain only letters, numbers, and underscores.",
            ));
        } else if password.len() < 8 || password.len() > 1024 {
            return Err(Status::invalid_argument(
                "Password must be at least 8 characters long.",
            ));
        } else if !is_valid_email(&email) {
            return Err(Status::invalid_argument("Invalid email address."));
        }

        let hash = {
            let _permit = self
                .semaphore
                .try_acquire()
                .map_err(|_| Status::resource_exhausted("Server busy, retry later."))?;
            generate_hash(password).map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/CreateUser", error = %e, "hashing failed");
                Status::internal("Internal server error.")
            })?
        };

        match self
            .db_client
            .create_user(name, &username, &email, &hash)
            .await
        {
            Ok(id) => Ok(Response::new(Identifier { id })),
            Err(e) => {
                if crate::utils::is_unique_violation(&e) {
                    Err(Status::already_exists(
                        "User with this username or email already exists.",
                    ))
                } else {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/CreateUser", error = %e, "creating user failed");
                    Err(Status::internal("Internal server error."))
                }
            }
        }
    }

    async fn get_user(&self, request: Request<UserRequest>) -> Result<Response<User>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = optional_user_id(&request);
        let target_user_id = request.into_inner().user_id;

        match self.db_client.get_user(target_user_id, user_id).await {
            Ok(Some(user)) => Ok(Response::new(user)),
            Ok(None) => Err(Status::not_found("Resource not found.")),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/GetUser", error = %e, "getting user failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn update_user(
        &self,
        request: Request<UpdateUserRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();

        let has_profile_changes = req.name.is_some()
            || req.username.is_some()
            || req.email.is_some()
            || req.bio.is_some()
            || req.profile_photo_key.is_some()
            || req.cover_photo_key.is_some();
        if !req.password.is_empty() && has_profile_changes {
            return Err(Status::invalid_argument(
                "Password and profile changes must be submitted separately.",
            ));
        }

        if !req.password.is_empty() {
            if req.old_password.is_empty() {
                return Err(Status::invalid_argument(
                    "Both password and the current password are required.",
                ));
            }

            let user = self
                .db_client
                .get_user_with_id(user_id)
                .await
                .map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/UpdateUser", error = %e, "getting user failed");
                    Status::internal("Internal server error.")
                })?
                .ok_or_else(|| Status::not_found("Resource not found."))?;

            let (_, hash_str) = user;
            let password_matches = {
                let _permit = self
                    .semaphore
                    .try_acquire()
                    .map_err(|_| Status::resource_exhausted("Server busy, retry later."))?;
                validate_password(&req.old_password, &hash_str).unwrap_or(false)
            };
            if !password_matches {
                return Err(Status::unauthenticated(
                    "Wrong password. Enter the correct current password.",
                ));
            }

            let password = req.password.as_str();
            if password.len() < 8 || password.len() > 1024 {
                return Err(Status::invalid_argument(
                    "New password must be at least 8 characters long.",
                ));
            }

            let new_hash = {
                let _permit = self
                    .semaphore
                    .try_acquire()
                    .map_err(|_| Status::resource_exhausted("Server busy, retry later."))?;
                generate_hash(password).map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/UpdateUser", error = %e, "hashing failed");
                    Status::internal("Internal server error.")
                })?
            };

            self.db_client
                .update_password(user_id, &new_hash)
                .await
                .map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/UpdateUser", error = %e, "updating user failed");
                    Status::internal("Internal server error.")
                })?;
        }

        let name = req.name.as_deref().unwrap_or("").trim();
        let username = req.username.as_deref().unwrap_or("").trim().to_lowercase();
        let email = req.email.as_deref().unwrap_or("").trim().to_lowercase();
        let bio = req.bio.as_deref().unwrap_or("").trim();
        let profile_photo_key = req
            .profile_photo_key
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty());
        let cover_photo_key = req
            .cover_photo_key
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty());

        if username.is_empty()
            && email.is_empty()
            && name.is_empty()
            && bio.is_empty()
            && profile_photo_key.is_none()
            && cover_photo_key.is_none()
        {
            return Ok(Response::new(Empty {}));
        }

        if req.name.as_deref().map(|s| !s.is_empty()).unwrap_or(false) && name.is_empty() {
            return Err(Status::invalid_argument("Name cannot be empty."));
        } else if !name.is_empty() && name.len() > 255 {
            return Err(Status::invalid_argument(
                "Name cannot exceed 255 characters.",
            ));
        } else if req.bio.as_deref().map(|s| !s.is_empty()).unwrap_or(false) && bio.is_empty() {
            return Err(Status::invalid_argument("Bio cannot be empty."));
        } else if !bio.is_empty() && bio.len() > 255 {
            return Err(Status::invalid_argument(
                "Bio cannot exceed 255 characters.",
            ));
        } else if !username.is_empty() && !is_valid_username(&username) {
            return Err(Status::invalid_argument(
                "Username may contain only letters, numbers, and underscores.",
            ));
        } else if !email.is_empty() && !is_valid_email(&email) {
            return Err(Status::invalid_argument("Invalid email address."));
        }

        let fields = UpdateUserFields {
            name,
            username: &username,
            email: &email,
            bio,
            profile_photo_key,
            cover_photo_key,
        };

        self.db_client
            .update_user(user_id, fields)
            .await
            .map_err(|e| {
                if crate::utils::is_unique_violation(&e) {
                    Status::already_exists("User with this username or email already exists.")
                } else {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/UpdateUser", error = %e, "updating user failed");
                    Status::internal("Internal server error.")
                }
            })?;

        Ok(Response::new(Empty {}))
    }

    async fn get_user_by_username(
        &self,
        request: Request<GetUserByUsernameRequest>,
    ) -> Result<Response<User>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = optional_user_id(&request);
        let req = request.into_inner();

        match self
            .db_client
            .get_user_by_username(&req.username, user_id)
            .await
        {
            Ok(Some(user)) => Ok(Response::new(user)),
            Ok(None) => Err(Status::not_found("Resource not found.")),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/GetUserByUsername", error = %e, "getting user by username failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn get_users_by_ids(&self, request: Request<Ids>) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();

        if req.ids.is_empty() {
            return Ok(Response::new(Users {
                users: vec![],
                next_cursor: String::new(),
            }));
        }

        if req.ids.len() > 200 {
            return Err(Status::invalid_argument("Too many IDs."));
        }

        let mut ids = req.ids;
        ids.sort_unstable();
        ids.dedup();

        match self.db_client.get_users_by_ids(&ids).await {
            Ok(users) => Ok(Response::new(Users {
                users,
                next_cursor: String::new(),
            })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/GetUsersByIds", error = %e, "getting users by ids failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn get_following(
        &self,
        request: Request<GetUsersRequest>,
    ) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();
        let limit = req.limit.clamp(1, 100);

        match self
            .db_client
            .get_following(req.user_id, &req.cursor, limit, user_id)
            .await
        {
            Ok(mut rows) => {
                let next_cursor = if rows.len() > limit as usize {
                    let last = &rows[limit as usize - 1];
                    pagination::encode_cursor(last.1, last.0.id)
                } else {
                    String::new()
                };
                rows.truncate(limit as usize);
                let users: Vec<User> = rows.into_iter().map(|(u, _)| u).collect();
                Ok(Response::new(Users { users, next_cursor }))
            }
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/GetFollowing", error = %e, "getting users failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn get_followers(
        &self,
        request: Request<GetUsersRequest>,
    ) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();
        let limit = req.limit.clamp(1, 100);

        match self
            .db_client
            .get_followers(req.user_id, &req.cursor, limit, user_id)
            .await
        {
            Ok(mut rows) => {
                let next_cursor = if rows.len() > limit as usize {
                    let last = &rows[limit as usize - 1];
                    pagination::encode_cursor(last.1, last.0.id)
                } else {
                    String::new()
                };
                rows.truncate(limit as usize);
                let users: Vec<User> = rows.into_iter().map(|(u, _)| u).collect();
                Ok(Response::new(Users { users, next_cursor }))
            }
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/GetFollowers", error = %e, "getting users failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn follow_user(&self, request: Request<UserRequest>) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();

        if req.user_id == user_id {
            return Err(Status::invalid_argument("Cannot follow yourself."));
        }

        match self.db_client.follow_user(req.user_id, user_id).await {
            Ok(_) => Ok(Response::new(Empty {})),
            Err(e) => {
                if crate::utils::is_foreign_key_violation(&e) {
                    Err(Status::not_found("User not found."))
                } else {
                    tracing::warn!(request_id = %request_id, method = "/cogito.UserService/FollowUser", error = %e, "following user failed");
                    Err(Status::internal("Internal server error."))
                }
            }
        }
    }

    async fn unfollow_user(
        &self,
        request: Request<UserRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();

        match self.db_client.unfollow_user(req.user_id, user_id).await {
            Ok(_) => Ok(Response::new(Empty {})),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/UnfollowUser", error = %e, "unfollowing user failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }

    async fn search_users(
        &self,
        request: Request<SearchUsersRequest>,
    ) -> Result<Response<Users>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();
        let limit = req.limit.clamp(1, 100);

        match self
            .db_client
            .search_users(&req.query, limit, user_id)
            .await
        {
            Ok(users) => Ok(Response::new(Users {
                users,
                next_cursor: String::new(),
            })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/cogito.UserService/SearchUsers", error = %e, "searching users failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }
}
