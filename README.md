# Thoughts

## Development

Pull Postgres
```sh
$ docker pull postgres
```

Create a directory for db persistence
```sh
$ mkdir -p $HOME/.containers/volumes/postgres
```

Run the postgres container
```sh
$ docker run --rm --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 \
-v $HOME/.containers/volumes/postgres:/var/lib/postgresql/data postgres
```

Connect to docker container
```sh
$ docker exec -it pg-docker psql -U postgres
```

## Authentication

- After authenticating, hand out a JWT that is valid for 15 minutes.
- Let the client refresh the token whenever it is expired. If this is done within seven days, a new JWT can be obtained without re-authenticating.
- After a session is inactive for seven days, require authentication before handing out a new JWT token.

## Reference

https://github.com/GoogleCloudPlatform/microservices-demo

## License

Licensed under the [MIT](LICENSE) License.
