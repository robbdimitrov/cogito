# Thoughts

**Thoughts** is a post-sharing application where users can create, browse, 
like and repost posts and follow other users.

## Screenshots

Feed | Profile
--- | ---
[![Screenshot of feed screen](/docs/img/01_feed.png)](/docs/img/01_feed.png) | [![Screenshot of profile screen](/docs/img/02_profile.png)](/docs/img/02_profile.png)

## Architecture

**Thoughts** is composed of microservices written in Go, Python and JavaScript, communicating over [gRPC](https://github.com/grpc/grpc).
Protobuf definitions can be found at the [`/pb` directory](/pb).

Service | Language | Description
--- | --- | ---
[apigateway](/src/apigateway) | Go | API Gateway between the frontend and the backend services.
[authservice](/src/authservice) | Python | Authentication service for creation and validation of sessions.
[database](/src/database) | SQL | PostgreSQL database with tables, relationships and functions.
[frontend](/src/frontend) | JavaScript | React frontend of the app.
[imageservice](/src/imageservice) | Go | Image upload and delivery service used for storing and retrieving image assets.
[postservice](/src/postservice) | Go | Service for creation, liking, reposting and fetching of posts.
[userservice](/src/userservice) | Python | Service for creation, following and fetching of users.

## Setup

### Clone the repository

Clone the repository to your filesystem

```sh
$ git clone git@github.com:robbdimitrov/thoughts.git
$ cd thoughts
```

### Build the images

Build all the images

```sh
$ make
```

Or build specific images

```sh
$ make apigateway
$ make authservice
$ make database
$ make frontend
$ make imageservice
$ make postservice
$ make userservice
```

### Create namespace

Create namespace for the k8s resources

```sh
$ kubectl create namespace thoughts
```

### Create deployments

Create deployments and volumes

```sh
$ kubectl apply -f ./k8s -n thoughts
```

## Access the frontend

Enable port forwarding

```sh
$ kubectl port-forward service/frontend 8080:8080 -n thoughts
```

Open the frontend [here](http://localhost:8080/).

## Cleanup

Delete all resources

```sh
$ kubectl delete -f ./k8s -n thoughts
```

Delete the namespace

```sh
$ kubectl delete namespace thoughts
```

## API

The API documentation is available [here](/docs/API.md).

## License

Licensed under the [MIT](LICENSE) License.
