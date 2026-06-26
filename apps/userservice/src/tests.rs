use super::controller::{Controller, UpdateUserFields, UserDb};
use crate::cogito::user_service_server::UserService;
use crate::cogito::{CreateUserRequest, User, UserRequest};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::Error as SqlxError;
use std::sync::Arc;
use tokio::sync::Mutex;
use tonic::Request;

struct MockDb {
    users: Mutex<Vec<User>>,
}

impl MockDb {
    fn new() -> Self {
        Self {
            users: Mutex::new(Vec::new()),
        }
    }
}

#[async_trait]
impl UserDb for Arc<MockDb> {
    async fn create_user(
        &self,
        name: &str,
        username: &str,
        email: &str,
        _password_hash: &str,
    ) -> Result<i32, SqlxError> {
        let mut users = self.users.lock().await;
        let id = (users.len() + 1) as i32;
        users.push(User {
            id,
            name: name.to_string(),
            username: username.to_string(),
            email: email.to_string(),
            bio: "".to_string(),
            posts: 0,
            likes: 0,
            following: 0,
            followers: 0,
            followed: false,
            created: "2026-06-02T00:00:00Z".to_string(),
            profile_photo_key: "".to_string(),
            cover_photo_key: "".to_string(),
        });
        Ok(id)
    }

    async fn get_user_with_id(&self, user_id: i32) -> Result<Option<(i32, String)>, SqlxError> {
        let users = self.users.lock().await;
        if let Some(u) = users.iter().find(|u| u.id == user_id) {
            Ok(Some((u.id, "hashedpassword".to_string()))) // Dummy password
        } else {
            Ok(None)
        }
    }

    async fn get_user(
        &self,
        user_id: i32,
        _current_user_id: i32,
    ) -> Result<Option<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users.iter().find(|u| u.id == user_id).cloned())
    }

    async fn get_user_by_username(
        &self,
        username: &str,
        _current_user_id: i32,
    ) -> Result<Option<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users.iter().find(|u| u.username == username).cloned())
    }

    async fn get_users_by_ids(&self, ids: &[i32]) -> Result<Vec<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users
            .iter()
            .filter(|u| ids.contains(&u.id))
            .cloned()
            .collect())
    }

    async fn update_user(
        &self,
        user_id: i32,
        fields: UpdateUserFields<'_>,
    ) -> Result<(), SqlxError> {
        let mut users = self.users.lock().await;
        if let Some(u) = users.iter_mut().find(|u| u.id == user_id) {
            // Mirror the COALESCE(NULLIF($n, ''), col) SQL: keep the existing
            // value when the incoming field is empty (proto3 default / omitted).
            if !fields.name.is_empty() {
                u.name = fields.name.to_string();
            }
            if !fields.username.is_empty() {
                u.username = fields.username.to_string();
            }
            if !fields.email.is_empty() {
                u.email = fields.email.to_string();
            }
            if !fields.bio.is_empty() {
                u.bio = fields.bio.to_string();
            }
            if let Some(key) = fields.profile_photo_key {
                u.profile_photo_key = key.to_string();
            }
            if let Some(key) = fields.cover_photo_key {
                u.cover_photo_key = key.to_string();
            }
        }
        Ok(())
    }

    async fn update_password(&self, _user_id: i32, _password_hash: &str) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn get_following(
        &self,
        _user_id: i32,
        _cursor: &str,
        _limit: i32,
        _current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError> {
        Ok(vec![])
    }

    async fn get_followers(
        &self,
        _user_id: i32,
        _cursor: &str,
        _limit: i32,
        _current_user_id: i32,
    ) -> Result<Vec<(User, DateTime<Utc>)>, SqlxError> {
        Ok(vec![])
    }

    async fn follow_user(&self, _user_id: i32, _follower_id: i32) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn unfollow_user(&self, _user_id: i32, _follower_id: i32) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn search_users(
        &self,
        query: &str,
        _limit: i32,
        _current_user_id: i32,
    ) -> Result<Vec<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users
            .iter()
            .filter(|u| u.username.contains(query))
            .cloned()
            .collect())
    }
}

fn create_request<T>(msg: T, user_id: i32) -> Request<T> {
    let mut req = Request::new(msg);
    req.metadata_mut()
        .insert("user-id", user_id.to_string().parse().unwrap());
    req
}

#[tokio::test]
async fn test_create_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller {
        db_client: db.clone(),
    };

    let req = create_request(
        CreateUserRequest {
            name: "Test".into(),
            username: "testuser".into(),
            email: "test@example.com".into(),
            password: "password".into(),
        },
        1,
    );

    let res = controller.create_user(req).await;
    assert!(res.is_ok());
    let id = res.unwrap().into_inner().id;
    assert_eq!(id, 1);
}

#[tokio::test]
async fn test_create_user_rejects_invalid_username() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db);
    let req = create_request(
        CreateUserRequest {
            name: "Test".into(),
            username: "invalid/user".into(),
            email: "test@example.com".into(),
            password: "password".into(),
        },
        1,
    );

    let error = controller.create_user(req).await.unwrap_err();
    assert_eq!(error.code(), tonic::Code::InvalidArgument);
}

#[tokio::test]
async fn test_get_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    // Create a user first
    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(UserRequest { user_id: 1 }, 1);
    let res = controller.get_user(req).await;

    assert!(res.is_ok());
    let user = res.unwrap().into_inner();
    assert_eq!(user.username, "testuser");
}

#[tokio::test]
async fn test_get_users_by_ids() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Alice", "alice", "alice@x.com", "hash")
        .await;
    let _ = db.create_user("Bob", "bob", "bob@x.com", "hash").await;
    let _ = db
        .create_user("Carol", "carol", "carol@x.com", "hash")
        .await;

    let req = create_request(crate::cogito::Ids { ids: vec![1, 3] }, 1);
    let res = controller.get_users_by_ids(req).await;

    assert!(res.is_ok());
    let users = res.unwrap().into_inner().users;
    assert_eq!(users.len(), 2);
    let usernames: Vec<&str> = users.iter().map(|u| u.username.as_str()).collect();
    assert!(usernames.contains(&"alice"));
    assert!(usernames.contains(&"carol"));
}

#[tokio::test]
async fn test_get_users_by_ids_empty_returns_empty() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let req = create_request(crate::cogito::Ids { ids: vec![] }, 1);
    let res = controller.get_users_by_ids(req).await;

    assert!(res.is_ok());
    assert!(res.unwrap().into_inner().users.is_empty());
}

use crate::cogito::{GetUserByUsernameRequest, SearchUsersRequest, UpdateUserRequest};

#[tokio::test]
async fn test_update_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(
        UpdateUserRequest {
            name: "Updated Name".into(),
            username: "updateduser".into(),
            email: "updated@example.com".into(),
            bio: "New Bio".into(),
            password: "".into(),
            old_password: "".into(),
            profile_photo_key: Some("key1".into()),
            cover_photo_key: Some("key2".into()),
        },
        1,
    );

    let res = controller.update_user(req).await;
    assert!(res.is_ok());

    let user = db.get_user(1, 1).await.unwrap().unwrap();
    assert_eq!(user.name, "Updated Name");
    assert_eq!(user.username, "updateduser");
    assert_eq!(user.bio, "New Bio");
    assert_eq!(user.profile_photo_key, "key1");
}

#[tokio::test]
async fn test_update_user_bio_only_does_not_require_username() {
    // A request that updates only the bio field (username and email absent/empty)
    // must not be rejected with a username-validation error.
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(
        UpdateUserRequest {
            name: String::new(),
            username: String::new(),
            email: String::new(),
            bio: "Updated bio".into(),
            password: String::new(),
            old_password: String::new(),
            profile_photo_key: None,
            cover_photo_key: None,
        },
        1,
    );

    let res = controller.update_user(req).await;
    assert!(res.is_ok(), "bio-only update should succeed, got: {:?}", res.err());
}

#[tokio::test]
async fn test_update_user_photo_only_does_not_require_username() {
    // A request that updates only the profile photo (all text fields absent)
    // must not be rejected with a username-validation error.
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(
        UpdateUserRequest {
            name: String::new(),
            username: String::new(),
            email: String::new(),
            bio: String::new(),
            password: String::new(),
            old_password: String::new(),
            profile_photo_key: Some("photo.jpg".into()),
            cover_photo_key: None,
        },
        1,
    );

    let res = controller.update_user(req).await;
    assert!(res.is_ok(), "photo-only update should succeed, got: {:?}", res.err());
}

#[tokio::test]
async fn test_update_user_partial_preserves_existing_fields() {
    // A bio-only update must not overwrite name/username/email with empty strings.
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(
        UpdateUserRequest {
            name: String::new(),
            username: String::new(),
            email: String::new(),
            bio: "Updated bio".into(),
            password: String::new(),
            old_password: String::new(),
            profile_photo_key: None,
            cover_photo_key: None,
        },
        1,
    );

    controller.update_user(req).await.unwrap();

    let user = db.get_user(1, 1).await.unwrap().unwrap();
    assert_eq!(user.name, "Test", "name must be preserved on bio-only update");
    assert_eq!(user.username, "testuser", "username must be preserved on bio-only update");
    assert_eq!(user.email, "test@example.com", "email must be preserved on bio-only update");
    assert_eq!(user.bio, "Updated bio", "bio must be updated");
}

#[tokio::test]
async fn test_update_user_rejects_invalid_username() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());
    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;
    let req = create_request(
        UpdateUserRequest {
            name: "Updated Name".into(),
            username: "invalid/user".into(),
            email: "updated@example.com".into(),
            bio: String::new(),
            password: String::new(),
            old_password: String::new(),
            profile_photo_key: None,
            cover_photo_key: None,
        },
        1,
    );

    let error = controller.update_user(req).await.unwrap_err();
    assert_eq!(error.code(), tonic::Code::InvalidArgument);
}

#[tokio::test]
async fn test_get_user_by_username() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test", "testuser", "test@example.com", "hash")
        .await;

    let req = create_request(
        GetUserByUsernameRequest {
            username: "testuser".into(),
        },
        1,
    );

    let res = controller.get_user_by_username(req).await;
    assert!(res.is_ok());
    let user = res.unwrap().into_inner();
    assert_eq!(user.username, "testuser");
}

#[tokio::test]
async fn test_search_users() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db
        .create_user("Test1", "user1", "test1@example.com", "hash")
        .await;
    let _ = db
        .create_user("Test2", "user2", "test2@example.com", "hash")
        .await;
    let _ = db
        .create_user("Other", "other", "other@example.com", "hash")
        .await;

    let req = create_request(
        SearchUsersRequest {
            query: "user".into(),
            limit: 10,
        },
        1,
    );

    let res = controller.search_users(req).await;
    assert!(res.is_ok());
    let users = res.unwrap().into_inner().users;
    assert_eq!(users.len(), 2);
}
