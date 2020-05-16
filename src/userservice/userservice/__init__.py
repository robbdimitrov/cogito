from concurrent import futures

import grpc

from userservice import thoughts_pb2_grpc
from userservice.controller import Controller


def create_server(port, db_client):
    controller = Controller(db_client)

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    thoughts_pb2_grpc.add_AuthServiceServicer_to_server(controller, server)

    server.add_insecure_port(f'[::]:{port}')

    return server
