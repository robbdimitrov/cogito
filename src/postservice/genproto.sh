#!/bin/bash

PROTODIR=../../pb
PATH=$PATH:$GOPATH/bin

protoc --go_out=plugins=grpc:genproto -I $PROTODIR $PROTODIR/thoughts.proto
