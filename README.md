# Thoughts

## Build

Build frontend
```sh
$ docker build -t thoughts/frontend src/frontend
```

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

## Reference

https://github.com/GoogleCloudPlatform/microservices-demo

## License

Licensed under the [MIT](LICENSE) License.
