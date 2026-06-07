#!/bin/bash -e

protoc -I../../packages/pb --go_out=./ --go-grpc_out=./ ../../packages/pb/thoughts.proto
