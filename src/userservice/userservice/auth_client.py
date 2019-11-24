import os
import grpc

from userservice import thoughts_pb2_grpc, thoughts_pb2


class AuthClient:
    def __init__(self, auth_url):
        self.auth_url = auth_url

    def get_auth_stub(self):
        channel = grpc.insecure_channel(self.auth_url)
        stub = thoughts_pb2_grpc.AuthServiceStub(channel)
        return stub

    def validate(self, token):
        stub = self.get_auth_stub()
        response = stub.Validate(thoughts_pb2.AuthRequest(token=token))
        return response

    def validate_password(self, email, password):
        stub = self.get_auth_stub()
        credentials = thoughts_pb2.Credentials(email=email, password=password)
        response = stub.ValidatePassword(credentials)
        return response
