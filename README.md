# Thoughts

Thoughts is a message sharing service.

## Table of contents

- [Stack](#stack)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Setup](#setup)
  - [Clone the repository](#clone-the-repository)
  - [Build the images](#build-the-images)
  - [Create deployments](#create-deployments)
- [Access the front end](#access-the-front-end)
- [Cleanup](#cleanup)
- [API](#api)
- [License](#license)

## Stack

- React
- Go
- Python
- PostgreSQL
- Docker
- Kubernetes

## Screenshots

## Architecture

**Thoughts** is composed of microservices written in Go, Python and JavaScript, communicating over [gRPC](https://github.com/grpc/grpc).

[![Architecture diagram](/docs/img/architecture-diagram.png)](/docs/img/architecture-diagram.png)

Protobuf definitions can be found at the [`/pb` directory](/pb).

Service | Language | Description
--- | --- | ---
[apiservice](/src/apiservice) | Go | API Gateway between the front end and the back end services.
[authservice](/src/authservice) | Python | Authentication service for creation and validation of access and refresh tokens.
[database](/src/database) | SQL | PostgreSQL database with tables, relationships and functions.
[frontend](/src/frontend) | JavaScript | React front end of the app.
[imageservice](/src/imageservice) | Go | Image upload and delivery service used for storing and retrieving image assets.
[postservice](/src/postservice) | Go | Service for creation, liking, retweeting and fetching of posts.
[userservice](/src/userservice) | Python | Service for creation, following and fetching of users.

## Setup

### Clone the repository

Clone the repository to your filesystem

```sh
$ git clone git@github.com:robbdimitrov/thoughts.git
$ cd thoughts
```

### Build the images

There are couple of ways to build the images. The easiest would be to run `make` in the root directory

```sh
$ make
```

Specific images can be built with `make` as well

```sh
$ make apiservice
$ make frontend
$ make database
$ make authservice
$ make userservice
$ make postservice
$ make imageservice
```

### Create deployments

Create deployments and volumes

```sh
$ kubectl apply -f k8s
```

## Access the front end

Enable port-forwarding for the front end and access it [here](http://localhost:8080/)

```sh
$ kubectl port-forward service/frontend 8080:80
```

## Cleanup

Delete everything in the cluster

```sh
$ kubectl delete -f k8s
```

Cleanup unused docker images

```sh
$ make clean
```

## API

The API documentation is available [here](/docs/API.md).

## License

Licensed under the [MIT](LICENSE) License.
