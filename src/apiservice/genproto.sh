#!/bin/bash

TOOLSDIR=./node_modules/.bin
PROTODIR=../../pb
SRC_DIR=./src/genproto

$TOOLSDIR/grpc_tools_node_protoc -I $PROTODIR --js_out=import_style=commonjs,binary:$SRC_DIR \
--grpc_out=$SRC_DIR --plugin=protoc-gen-grpc=$TOOLSDIR/grpc_tools_node_protoc_plugin \
$PROTODIR/thoughts.proto
