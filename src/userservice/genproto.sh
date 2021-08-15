#!/bin/bash -e

python -m grpc_tools.protoc -I../../pb \
  --python_out=./userservice \
  --grpc_python_out=./userservice \
  p../../pb/thoughts.proto
