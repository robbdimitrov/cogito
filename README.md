# Thoughts

**Thoughts** is a post-sharing application where users can create, browse,
like and repost posts and follow other users.

## Architecture

Service | Language | Description
--- | --- | ---
[apigateway](/src/apigateway) | Go | API Gateway between the frontend and the backend services.
[authservice](/src/authservice) | Rust | Authentication service for creation and validation of sessions.
[database](/src/database) | SQL | PostgreSQL database with tables, relationships and functions.
[frontend](/src/frontend) | JavaScript | React frontend of the app.
[postservice](/src/postservice) | Go | Service for creation, liking, reposting and fetching of posts.
[userservice](/src/userservice) | Rust | Service for creation, following and fetching of users.

## Deploy

Deploy the application to your active Kubernetes cluster using the provided script:

```sh
./scripts/deploy.sh
```

The script builds the Docker images, creates the Kubernetes namespace (`thoughts` by default) and resources, waits for pods to be ready, and starts a port-forward to the frontend at http://localhost:8080/. It is idempotent and safe to re-run for updates.

## Testing

Run all unit tests across the frontend and backend microservices using the provided `Makefile` target:

```sh
make test
```

**Prerequisites:** `kubectl`, `docker`, and `make` must be installed.

**Cleanup:**

```sh
kubectl delete -f ./k8s -n thoughts
kubectl delete namespace thoughts
```

## License

Licensed under the [MIT](LICENSE) License.
