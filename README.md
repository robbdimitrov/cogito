# Thoughts

## Build images

Build images
```sh
$ docker build -t thoughts/apiservice src/apiservice
$ docker build -t thoughts/frontend src/frontend
$ docker build -t thoughts/database src/database
$ docker build -t thoughts/authservice src/authservice
$ docker build -t thoughts/userservice src/userservice
$ docker build -t thoughts/postservice src/postservice
$ docker build -t thoughts/imageservice src/imageservice
```

## Create deployments

Create configs
```
$ kubectl apply -f k8s/configmap
```

Create volumes
```
$ kubectl apply -f k8s/volume
```

Create deployments
```
$ kubectl apply -f k8s/deployment
```

## Access the frontend

```sh
$ kubectl port-forward service/frontend 8080:80
```

## Development

Print envs visible for Pod
```sh
$ kubectl exec <POD_ID> -- printenv | grep SERVICE
```

## Reference

https://github.com/GoogleCloudPlatform/microservices-demo

## License

Licensed under the [MIT](LICENSE) License.
