#!/bin/bash

PROTODIR=../../pb
PATH=$PATH:$GOPATH/bin

protoc -I $PROTODIR --go_out=plugins=grpc:genproto $PROTODIR/thoughts.proto
