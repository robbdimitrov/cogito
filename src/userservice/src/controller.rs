use crate::crypto::{generate_hash, validate_password};
use crate::thoughts::user_service_server::UserService;
use crate::thoughts::{
    CreateUserRequest, Empty, GetUserByUsernameRequest, GetUsersRequest, Identifier,
    SearchUsersRequest, UpdateUserRequest, User, UserRequest, Users,
};
use crate::utils::{get_user_id, is_valid_email};
use sqlx::Error as SqlxError;
use tonic::{Request, Response, Status};

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
    async fn update_user(
        &self,
        user_id: i32,
        fields: UpdateUserFields<'_>,
    ) -> Result<(), SqlxError>;
    async fn update_password(&self, user_id: i32, password_hash: &str) -> Result<(), SqlxError>;
    async fn get_following(
        &self,
        user_id: i32,
        page: i32,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<User>, SqlxError>;
    async fn get_followers(
        &self,
        user_id: i32,
        page: i32,
        limit: i32,
        current_user_id: i32,
    ) -> Result<Vec<User>, SqlxError>;
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
}

impl<D: UserDb> Controller<D> {
    pub fn new(db_client: D) -> Self {
        Self { db_client }
    }
}

#[tonic::async_trait]
impl<D: UserDb> UserService for Controller<D> {
    async fn create_user(
        &self,
        request: Request<CreateUserRequest>,
    ) -> Result<Response<Identifier>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let req = request.into_inner();
        if req.username.is_empty() || req.email.is_empty() || req.password.is_empty() {
            return Err(Status::invalid_argument(
                "Name, username, email and password are required.",
            ));
        } else if req.password.len() < 8 {
            return Err(Status::invalid_argument(
                "Password must be at least 8 characters long.",
            ));
        } else if !is_valid_email(&req.email) {
            return Err(Status::invalid_argument("Invalid email address."));
        }

        let hash = generate_hash(&req.password).map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/CreateUser", error = %e, "hashing failed");
            Status::internal("Internal server error.")
        })?;

        match self
            .db_client
            .create_user(&req.name, &req.username, &req.email, &hash)
            .await
        {
            Ok(id) => Ok(Response::new(Identifier { id })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/CreateUser", error = %e, "creating user failed");
                Err(Status::invalid_argument(
                    "User with this username or email already exists.",
                ))
            }
        }
    }

    async fn get_user(&self, request: Request<UserRequest>) -> Result<Response<User>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let target_user_id = request.into_inner().user_id;

        match self.db_client.get_user(target_user_id, user_id).await {
            Ok(Some(user)) => Ok(Response::new(user)),
            Ok(None) => Err(Status::not_found("Resource not found.")),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/GetUser", error = %e, "getting user failed");
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
                    tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/UpdateUser", error = %e, "getting user failed");
                    Status::internal("Internal server error.")
                })?
                .ok_or_else(|| Status::not_found("Resource not found."))?;

            let (_, hash_str) = user;
            if !validate_password(&req.old_password, &hash_str).unwrap_or(false) {
                return Err(Status::invalid_argument(
                    "Wrong password. Enter the correct current password.",
                ));
            }

            if req.password.len() < 8 {
                return Err(Status::invalid_argument(
                    "New password must be at least 8 characters long.",
                ));
            }

            let new_hash = generate_hash(&req.password).map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/UpdateUser", error = %e, "hashing failed");
                Status::internal("Internal server error.")
            })?;

            self.db_client
                .update_password(user_id, &new_hash)
                .await
                .map_err(|e| {
                    tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/UpdateUser", error = %e, "updating user failed");
                    Status::internal("Internal server error.")
                })?;

            return Ok(Response::new(Empty {}));
        }

        if !is_valid_email(&req.email) {
            return Err(Status::invalid_argument("Invalid email address."));
        }

        let fields = UpdateUserFields {
            name: &req.name,
            username: &req.username,
            email: &req.email,
            bio: &req.bio,
            profile_photo_key: req.profile_photo_key.as_deref(),
            cover_photo_key: req.cover_photo_key.as_deref(),
        };

        self.db_client
            .update_user(user_id, fields)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/UpdateUser", error = %e, "updating user failed");
                Status::internal("Internal server error.")
            })?;

        Ok(Response::new(Empty {}))
    }

    async fn get_user_by_username(
        &self,
        request: Request<GetUserByUsernameRequest>,
    ) -> Result<Response<User>, Status> {
        let request_id = crate::logging::request_id(&request).to_string();
        let user_id = get_user_id(&request)?;
        let req = request.into_inner();

        match self
            .db_client
            .get_user_by_username(&req.username, user_id)
            .await
        {
            Ok(Some(user)) => Ok(Response::new(user)),
            Ok(None) => Err(Status::not_found("Resource not found.")),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/GetUserByUsername", error = %e, "getting user by username failed");
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

        match self
            .db_client
            .get_following(req.user_id, req.page, req.limit, user_id)
            .await
        {
            Ok(users) => Ok(Response::new(Users { users })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/GetFollowing", error = %e, "getting users failed");
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

        match self
            .db_client
            .get_followers(req.user_id, req.page, req.limit, user_id)
            .await
        {
            Ok(users) => Ok(Response::new(Users { users })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/GetFollowers", error = %e, "getting users failed");
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
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/FollowUser", error = %e, "following user failed");
                Err(Status::internal("Internal server error."))
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
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/UnfollowUser", error = %e, "unfollowing user failed");
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

        match self
            .db_client
            .search_users(&req.query, req.limit, user_id)
            .await
        {
            Ok(users) => Ok(Response::new(Users { users })),
            Err(e) => {
                tracing::warn!(request_id = %request_id, method = "/thoughts.UserService/SearchUsers", error = %e, "searching users failed");
                Err(Status::internal("Internal server error."))
            }
        }
    }
}
