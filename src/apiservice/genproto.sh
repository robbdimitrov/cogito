#!/bin/bash

PROTODIR=../../pb
protoc -I $PROTODIR --go_out=plugins=grpc:genproto $PROTODIR/thoughts.proto
