#!/bin/bash -e

protoc -I../../pb --go_out=plugins=grpc:genproto ../../pb/thoughts.proto
