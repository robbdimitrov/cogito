use super::controller::Controller;
use super::controller::UserDb;
use crate::thoughts::{User, CreateUserRequest, UserRequest};
use async_trait::async_trait;
use sqlx::Error as SqlxError;
use tonic::Request;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::thoughts::user_service_server::UserService;

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
    async fn create_user(&self, name: &str, username: &str, email: &str, _password_hash: &str) -> Result<i32, SqlxError> {
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

    async fn get_user(&self, user_id: i32, _current_user_id: i32) -> Result<Option<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users.iter().find(|u| u.id == user_id).cloned())
    }

    async fn get_user_by_username(&self, username: &str, _current_user_id: i32) -> Result<Option<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users.iter().find(|u| u.username == username).cloned())
    }

    async fn update_user(&self, user_id: i32, name: &str, username: &str, email: &str, bio: &str, profile_photo_key: Option<&str>, cover_photo_key: Option<&str>) -> Result<(), SqlxError> {
        let mut users = self.users.lock().await;
        if let Some(u) = users.iter_mut().find(|u| u.id == user_id) {
            u.name = name.to_string();
            u.username = username.to_string();
            u.email = email.to_string();
            u.bio = bio.to_string();
            if let Some(key) = profile_photo_key { u.profile_photo_key = key.to_string(); }
            if let Some(key) = cover_photo_key { u.cover_photo_key = key.to_string(); }
        }
        Ok(())
    }

    async fn update_password(&self, _user_id: i32, _password_hash: &str) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn get_following(&self, _user_id: i32, _page: i32, _limit: i32, _current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        Ok(vec![])
    }

    async fn get_followers(&self, _user_id: i32, _page: i32, _limit: i32, _current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        Ok(vec![])
    }

    async fn follow_user(&self, _user_id: i32, _follower_id: i32) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn unfollow_user(&self, _user_id: i32, _follower_id: i32) -> Result<(), SqlxError> {
        Ok(())
    }

    async fn search_users(&self, query: &str, _limit: i32, _current_user_id: i32) -> Result<Vec<User>, SqlxError> {
        let users = self.users.lock().await;
        Ok(users.iter().filter(|u| u.username.contains(query)).cloned().collect())
    }
}

fn create_request<T>(msg: T, user_id: i32) -> Request<T> {
    let mut req = Request::new(msg);
    req.metadata_mut().insert("user-id", user_id.to_string().parse().unwrap());
    req
}

#[tokio::test]
async fn test_create_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller { db_client: db.clone() };

    let req = create_request(CreateUserRequest {
        name: "Test".into(),
        username: "testuser".into(),
        email: "test@example.com".into(),
        password: "password".into(),
    }, 1);

    let res = controller.create_user(req).await;
    assert!(res.is_ok());
    let id = res.unwrap().into_inner().id;
    assert_eq!(id, 1);
}

#[tokio::test]
async fn test_get_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    // Create a user first
    let _ = db.create_user("Test", "testuser", "test@example.com", "hash").await;

    let req = create_request(UserRequest { user_id: 1 }, 1);
    let res = controller.get_user(req).await;
    
    assert!(res.is_ok());
    let user = res.unwrap().into_inner();
    assert_eq!(user.username, "testuser");
}

use crate::thoughts::{UpdateUserRequest, GetUserByUsernameRequest, SearchUsersRequest};

#[tokio::test]
async fn test_update_user() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db.create_user("Test", "testuser", "test@example.com", "hash").await;

    let req = create_request(UpdateUserRequest {
        name: "Updated Name".into(),
        username: "updateduser".into(),
        email: "updated@example.com".into(),
        bio: "New Bio".into(),
        password: "".into(),
        old_password: "".into(),
        profile_photo_key: Some("key1".into()),
        cover_photo_key: Some("key2".into()),
    }, 1);

    let res = controller.update_user(req).await;
    assert!(res.is_ok());

    let user = db.get_user(1, 1).await.unwrap().unwrap();
    assert_eq!(user.name, "Updated Name");
    assert_eq!(user.username, "updateduser");
    assert_eq!(user.bio, "New Bio");
    assert_eq!(user.profile_photo_key, "key1");
}

#[tokio::test]
async fn test_get_user_by_username() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db.create_user("Test", "testuser", "test@example.com", "hash").await;

    let req = create_request(GetUserByUsernameRequest {
        username: "testuser".into(),
    }, 1);

    let res = controller.get_user_by_username(req).await;
    assert!(res.is_ok());
    let user = res.unwrap().into_inner();
    assert_eq!(user.username, "testuser");
}

#[tokio::test]
async fn test_search_users() {
    let db = Arc::new(MockDb::new());
    let controller = Controller::new(db.clone());

    let _ = db.create_user("Test1", "user1", "test1@example.com", "hash").await;
    let _ = db.create_user("Test2", "user2", "test2@example.com", "hash").await;
    let _ = db.create_user("Other", "other", "other@example.com", "hash").await;

    let req = create_request(SearchUsersRequest {
        query: "user".into(),
        limit: 10,
    }, 1);

    let res = controller.search_users(req).await;
    assert!(res.is_ok());
    let users = res.unwrap().into_inner().users;
    assert_eq!(users.len(), 2);
}
