# Thoughts

**Thoughts** is a post-sharing application where users can create, browse,
like and repost posts and follow other users.

## Architecture

Service | Language | Description
--- | --- | ---
[apigateway](/src/apigateway) | Go | API Gateway between the frontend and the backend services.
[authservice](/src/authservice) | Python | Authentication service for creation and validation of sessions.
[database](/src/database) | SQL | PostgreSQL database with tables, relationships and functions.
[frontend](/src/frontend) | JavaScript | React frontend of the app.
[postservice](/src/postservice) | Go | Service for creation, liking, reposting and fetching of posts.
[userservice](/src/userservice) | Python | Service for creation, following and fetching of users.

## Deploy

Deploy the application to a local [kind](https://kind.sigs.k8s.io/) cluster using the provided script:

```sh
./scripts/deploy.sh
```

The script builds the Docker images, loads them into the kind cluster, creates the Kubernetes namespace and resources, waits for pods to be ready, and starts a port-forward to the frontend at http://localhost:8080/.

**Prerequisites:** `kind`, `kubectl`, `docker`, and `make` must be installed.

**Cleanup:**

```sh
kind delete cluster --name thoughts
```

## License

Licensed under the [MIT](LICENSE) License.
