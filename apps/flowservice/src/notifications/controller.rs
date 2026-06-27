use tonic::{Request, Response, Status};

use crate::cogito::notification_service_server::NotificationService;
use crate::cogito::{
    Empty, GetNotificationsRequest, NotificationRequest, Notifications, UnreadCountResponse,
    UserRequest,
};
use crate::notifications::db::{InvalidCursor, NotificationDb};

#[derive(Clone)]
pub struct NotificationController<D: NotificationDb + Clone> {
    db: D,
}

impl<D: NotificationDb + Clone> NotificationController<D> {
    pub fn new(db: D) -> Self {
        Self { db }
    }
}

#[tonic::async_trait]
impl<D: NotificationDb + Clone> NotificationService for NotificationController<D> {
    async fn get_notifications(
        &self,
        request: Request<GetNotificationsRequest>,
    ) -> Result<Response<Notifications>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();

        let limit = match req.limit {
            n if n < 1 => 20,
            n if n > 50 => 50,
            n => n,
        };

        let (items, next_cursor) = self
            .db
            .list(req.user_id, &req.cursor, limit)
            .await
            .map_err(|e| {
                if e.is::<InvalidCursor>() {
                    Status::invalid_argument("Invalid cursor.")
                } else {
                    tracing::warn!(request_id = %request_id, method = "/cogito.NotificationService/GetNotifications", error = %e, "list notifications failed");
                    Status::internal("Internal server error.")
                }
            })?;

        let notifications = items
            .into_iter()
            .map(|n| crate::cogito::Notification {
                id: n.id,
                external_id: n.external_id,
                user_id: n.user_id,
                actor_id: n.actor_id,
                r#type: n.notification_type,
                entity_id: n.entity_id,
                read: n.read,
                created: n.created.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            })
            .collect();

        Ok(Response::new(Notifications {
            notifications,
            next_cursor,
        }))
    }

    async fn mark_notification_read(
        &self,
        request: Request<NotificationRequest>,
    ) -> Result<Response<Empty>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();

        let found = self
            .db
            .mark_read(req.notification_id, req.user_id)
            .await
            .map_err(|e| {
                tracing::warn!(request_id = %request_id, method = "/cogito.NotificationService/MarkNotificationRead", error = %e, "mark notification read failed");
                Status::internal("Internal server error.")
            })?;

        if !found {
            return Err(Status::not_found("Notification not found."));
        }

        Ok(Response::new(Empty {}))
    }

    async fn get_unread_count(
        &self,
        request: Request<UserRequest>,
    ) -> Result<Response<UnreadCountResponse>, Status> {
        let request_id = crate::logging::request_id(&request).to_owned();
        let req = request.into_inner();

        let count = self.db.unread_count(req.user_id).await.map_err(|e| {
            tracing::warn!(request_id = %request_id, method = "/cogito.NotificationService/GetUnreadCount", error = %e, "get unread count failed");
            Status::internal("Internal server error.")
        })?;

        Ok(Response::new(UnreadCountResponse { count }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notifications::db::{InvalidCursor, Notification, NotificationDb};
    use chrono::Utc;

    #[derive(Clone)]
    struct MockNotificationDb {
        list_result: MockListResult,
        mark_read_result: MockMarkReadResult,
        unread_count_result: MockUnreadCountResult,
    }

    #[derive(Clone)]
    enum MockListResult {
        Ok(Vec<Notification>, String),
        InvalidCursor,
        DbError,
    }

    #[derive(Clone)]
    enum MockMarkReadResult {
        Found,
        NotFound,
        DbError,
    }

    #[derive(Clone)]
    enum MockUnreadCountResult {
        Ok(i32),
        DbError,
    }

    #[tonic::async_trait]
    impl NotificationDb for MockNotificationDb {
        async fn insert(
            &self,
            _external_id: i64,
            _user_id: i32,
            _actor_id: i32,
            _notif_type: &str,
            _entity_id: &str,
        ) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn mark_read(&self, _id: i64, _user_id: i32) -> Result<bool, sqlx::Error> {
            match &self.mark_read_result {
                MockMarkReadResult::Found => Ok(true),
                MockMarkReadResult::NotFound => Ok(false),
                MockMarkReadResult::DbError => Err(sqlx::Error::RowNotFound),
            }
        }

        async fn list(
            &self,
            _user_id: i32,
            _cursor: &str,
            _limit: i32,
        ) -> Result<(Vec<Notification>, String), Box<dyn std::error::Error + Send + Sync>> {
            match &self.list_result {
                MockListResult::Ok(items, cursor) => Ok((items.clone(), cursor.clone())),
                MockListResult::InvalidCursor => Err(Box::new(InvalidCursor)),
                MockListResult::DbError => Err(Box::new(sqlx::Error::RowNotFound)),
            }
        }

        async fn unread_count(&self, _user_id: i32) -> Result<i32, sqlx::Error> {
            match &self.unread_count_result {
                MockUnreadCountResult::Ok(n) => Ok(*n),
                MockUnreadCountResult::DbError => Err(sqlx::Error::RowNotFound),
            }
        }

        async fn delete_by_entity(
            &self,
            _entity_id: &str,
            _types: &[&str],
        ) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn delete_by_actor_and_type(
            &self,
            _actor_id: i32,
            _recipient_id: i32,
            _notif_type: &str,
            _entity_id: &str,
        ) -> Result<(), sqlx::Error> {
            Ok(())
        }
    }

    fn make_notification() -> Notification {
        Notification {
            id: 1,
            external_id: 100,
            user_id: 10,
            actor_id: 20,
            notification_type: "like".to_string(),
            entity_id: "99".to_string(),
            read: false,
            created: Utc::now(),
        }
    }

    fn mock_db(
        list: MockListResult,
        mark_read: MockMarkReadResult,
        unread: MockUnreadCountResult,
    ) -> MockNotificationDb {
        MockNotificationDb {
            list_result: list,
            mark_read_result: mark_read,
            unread_count_result: unread,
        }
    }

    #[tokio::test]
    async fn test_get_notifications_success() {
        let n = make_notification();
        let db = mock_db(
            MockListResult::Ok(vec![n], "next-cursor".to_string()),
            MockMarkReadResult::Found,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(GetNotificationsRequest {
            user_id: 10,
            cursor: String::new(),
            limit: 10,
        });
        let res = controller.get_notifications(req).await;
        assert!(res.is_ok());
        let body = res.unwrap().into_inner();
        assert_eq!(body.notifications.len(), 1);
        assert_eq!(body.next_cursor, "next-cursor");
    }

    #[tokio::test]
    async fn test_get_notifications_invalid_cursor() {
        let db = mock_db(
            MockListResult::InvalidCursor,
            MockMarkReadResult::Found,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(GetNotificationsRequest {
            user_id: 10,
            cursor: "bad-cursor".to_string(),
            limit: 10,
        });
        let res = controller.get_notifications(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::InvalidArgument);
    }

    #[tokio::test]
    async fn test_get_notifications_db_error() {
        let db = mock_db(
            MockListResult::DbError,
            MockMarkReadResult::Found,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(GetNotificationsRequest {
            user_id: 10,
            cursor: String::new(),
            limit: 10,
        });
        let res = controller.get_notifications(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);
    }

    #[tokio::test]
    async fn test_mark_notification_read_found() {
        let db = mock_db(
            MockListResult::Ok(vec![], String::new()),
            MockMarkReadResult::Found,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(NotificationRequest {
            notification_id: 1,
            user_id: 10,
        });
        let res = controller.mark_notification_read(req).await;
        assert!(res.is_ok());
    }

    #[tokio::test]
    async fn test_mark_notification_read_not_found() {
        let db = mock_db(
            MockListResult::Ok(vec![], String::new()),
            MockMarkReadResult::NotFound,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(NotificationRequest {
            notification_id: 99,
            user_id: 10,
        });
        let res = controller.mark_notification_read(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::NotFound);
    }

    #[tokio::test]
    async fn test_mark_notification_read_db_error() {
        let db = mock_db(
            MockListResult::Ok(vec![], String::new()),
            MockMarkReadResult::DbError,
            MockUnreadCountResult::Ok(0),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(NotificationRequest {
            notification_id: 1,
            user_id: 10,
        });
        let res = controller.mark_notification_read(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);
    }

    #[tokio::test]
    async fn test_get_unread_count_success() {
        let db = mock_db(
            MockListResult::Ok(vec![], String::new()),
            MockMarkReadResult::Found,
            MockUnreadCountResult::Ok(7),
        );
        let controller = NotificationController::new(db);
        let req = Request::new(UserRequest { user_id: 10 });
        let res = controller.get_unread_count(req).await;
        assert!(res.is_ok());
        assert_eq!(res.unwrap().into_inner().count, 7);
    }

    #[tokio::test]
    async fn test_get_unread_count_db_error() {
        let db = mock_db(
            MockListResult::Ok(vec![], String::new()),
            MockMarkReadResult::Found,
            MockUnreadCountResult::DbError,
        );
        let controller = NotificationController::new(db);
        let req = Request::new(UserRequest { user_id: 10 });
        let res = controller.get_unread_count(req).await;
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code(), tonic::Code::Internal);
    }
}
