#!/bin/bash -e

python -m grpc_tools.protoc -I../../pb \
  --python_out=./authservice \
  --grpc_python_out=./authservice \
  p../../pb/thoughts.proto
