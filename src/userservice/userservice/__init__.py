from concurrent import futures
import os

import grpc

from userservice import thoughts_pb2_grpc
from userservice.controller import Controller

DEFAULT_INTERNAL_GRPC_TOKEN = 'dev-internal-grpc-token'


class InternalAuthInterceptor(grpc.ServerInterceptor):
    def __init__(self):
        self.token = os.getenv('INTERNAL_GRPC_TOKEN') or DEFAULT_INTERNAL_GRPC_TOKEN

    def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata or [])
        if metadata.get('internal-token') == self.token:
            return continuation(handler_call_details)

        def abort(request, context):
            context.abort(grpc.StatusCode.UNAUTHENTICATED, 'Unauthenticated.')

        return grpc.unary_unary_rpc_method_handler(abort)


def create_server(port, db_client):
    controller = Controller(db_client)

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=(InternalAuthInterceptor(),)
    )
    thoughts_pb2_grpc.add_UserServiceServicer_to_server(controller, server)

    server.add_insecure_port(f'[::]:{port}')

    return server
