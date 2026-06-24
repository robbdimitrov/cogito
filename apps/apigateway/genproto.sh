#!/bin/bash -e

protoc -I../../pkg/pb --go_out=./ --go-grpc_out=./ ../../pkg/pb/cogito.proto
