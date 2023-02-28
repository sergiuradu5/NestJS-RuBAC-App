<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest
# Rule Based Access Control App

## Description

A [Nest](https://github.com/nestjs/nest) application demonstrating Rule Based Access Control (RuBAC) by providing a predefined set of JSON `Workflows` that contain `Rules` and `Expressions` and can be provided `Params` from outside.

Here is an example of the `Workflow` structure that should be provided to the app:
```JSON
{
  "WorkflowID": 1,
  "WorkflowName": "Allow only specific IP for ADMIN role",
  "Path": "/admin/*",
  "Params": [
    {
      "Name": "ip_address",
      "Expression": "$request.getIpAddress"
    },
    {
      "Name": "user_role",
      "Expression": "$user.getRole"
    }
  ],
  "Rules": [
    {
      "RuleName": "Allow only specific IP",
      "Expression": "'100.100.100.100' == $ip_address"
    },
    {
      "RuleName": "Check role",
      "Expression": "$user_role == 'ADMIN'"
    }
  ]
}

```

## Implementation
There are two versions of the app. Solution in `V1` revolves around verbose regular expressions that are used to parse the `Expressions` in `Rules`. It is available on the branch `v1-regexp` of the current repository.

However, `V2` of the app that is available on the `main` branch uses a different approach on parsing the `Expressions` in `Rules`. It borrows ideas from the parsing of programming language, using entities such as `Parser`, `Tokenizer`, and `Interpreter`. Concepts such as the Abstract Syntax Tree are used in the implementation.

Though more robust and more extendable, the implementation in `V2` requires more knowledge in order to be maintained in comparison to `V1`. Nonetheless, it is a non-trivial approach with more power to it.

## App routes
The repo contains two predefined workflows inside the `rules` folder. After cloning the repo on your machine, without any consequent modification from your part, the app runs with two routes that serve for testing purposes of the workflows.

The available app routes are:
```
/admin/w1
/admin/w2
```
## Workflow features during the processing of requests
As of now, the underlying service can recognize the following actions when a request is processed: 
1. Extract the user role
2. Extract the request path
3. Extract the request ip address

Whatever is extracted from the request can be injected into the parsed workflows in order to evaluate its rules.

### Set user role
For ease of testing, in order to set the user role without performing any authentication, simply set the request header `Role` with any value.
E.g. `"Role" : "ADMIN"` or `"Role" : "SUPER_ADMIN"` etc.

### Set own ip address
Again, for testing purposes, the app has been implemented to permit a way of setting own request ip address. In order to do so, set the request header `X-Forwarded-For` to any ip address value of choice.
E.g. `"X-Forwarded-For" : "100.100.100.1"` etc.

## Installation

```bash
$ npm install
```

## Running the app locally

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e
```

## Running the app via Docker

### Using `sergiuradu/nest-rubac-app` image from dockerhub
```bash
# cd to docker folder
$ cd docker

# run docker compose by pulling image from dockerhub
# without building local image from Dockerfile
$ docker-compose up -V
```
The app is running on `localhost:3000`.

NOTE: An `.env` file (file name doesn't matter) must be provided that contains exactly the following environment variable:
```
RULES_FOLDER=./rules
```

NOTE: The online image contains a set of predefined `Workflows` inside the `./rules` folder within the actual image.  If you wish to run the app via docker with your own custom `Workflows`, follow instructions from this section: [Building your own local docker image](#building-your-own-local-docker-image)

### Building your own local docker image
```bash
# cd to docker folder
$ cd docker

# run docker compose by adding --build to build local image from Dockerfile
$ docker-compose up -V --build
```

NOTE: use this approach if you want to build your own image with your own `Workflows` or modify them inside the `rules` folder.

