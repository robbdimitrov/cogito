import os
import grpc

from userservice import thoughts_pb2_grpc


def get_auth_stub():
    channel = grpc.insecure_channel(os.getenv('AUTH_URI'))
    stub = thoughts_pb2_grpc.AuthServiceStub(channel)
    return stub
