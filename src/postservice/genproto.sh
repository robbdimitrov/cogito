#!/bin/bash -e

protoc -I../../pb --go_out=./post --go-grpc_out=./post ../../pb/thoughts.proto
