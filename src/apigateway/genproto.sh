#!/bin/bash -e

protoc -I../../pb --go_out=./ --go-grpc_out=./ ../../pb/thoughts.proto
