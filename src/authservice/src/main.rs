pub mod thoughts {
    include!("thoughts.rs");
}

mod db_client;
mod controller;

use std::env;
use tonic::transport::Server;
use thoughts::auth_service_server::AuthServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = env::var("PORT").unwrap_or_else(|_| "5050".to_string());
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let addr = format!("0.0.0.0:{}", port).parse()?;
    println!("Server is starting on port {}", port);

    let db_client = db_client::DbClient::new(&db_url).await?;
    let controller = controller::Controller::new(db_client);

    Server::builder()
        .add_service(AuthServiceServer::new(controller))
        .serve(addr)
        .await?;

    Ok(())
}
