#!/bin/bash -e

protoc -I../../pb --go_out=./api --go-grpc_out=./api ../../pb/thoughts.proto
