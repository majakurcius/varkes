<p align="center">
 <img src="../../assets/logo.svg" width="150">
</p>

# kyma-mock example

This example is mocking the Kyma application

## Run local

To run it local run:

```bash
npm install
npm start
```

Navigate to `http://localhost:10000/connector/console` to see the connector api console

Navigate to `http://localhost:10000/events/console` to see the events api console

Navigate to `http://localhost:10000/metadata/console` to see the metadata api console

## Run local using docker

To run it using docker, call:

```bash
docker run -p 10000:10000 eu.gcr.io/kyma-project/incubator/varkes-example-kyma-mock:latest
```

## Run in Kubernetes

To run the mock using Kubernetes as runtime envrironment, run the following kubectl command to set up a namespace:

```bash
kubectl create namespace mocks
```

and to deploy the mock

```bash
kubectl apply -n mocks -f https://raw.githubusercontent.com/kyma-incubator/varkes/master/examples/kyma-mock/deployment/deployment.yaml
```
