#!/bin/bash

PROTODIR=../../pb
SRC_DIR=./userservice

python -m grpc_tools.protoc -I $PROTODIR --python_out=$SRC_DIR \
--grpc_python_out=$SRC_DIR ../../pb/thoughts.proto
