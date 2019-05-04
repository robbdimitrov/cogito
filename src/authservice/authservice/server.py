import grpc
from concurrent import futures
import time

from authservice import thoughts_pb2_grpc
from authservice.auth import AuthService
from authservice.db import Database
from authservice.db_client import DBClient


class Server:
    def __init__(self):
        self.config = {}

    def create_auth_service(self):
        db = Database(self.config['DB_URI'])
        db_client = DBClient(db)
        auth_service = AuthService(db_client, self.config['JWT_SECRET'])
        return auth_service

    def create_server(self):
        auth_service = self.create_auth_service()

        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        thoughts_pb2_grpc.add_AuthServiceServicer_to_server(auth_service, server)

        server.add_insecure_port(f'[::]:{self.config["PORT"]}')

        return server

    def serve(self):
        server = self.create_server()
        server.start()
        print(f'Server running on port {self.config["PORT"]}')
        try:
            while True:
                time.sleep(60 * 60 * 24)
        except KeyboardInterrupt:
            server.stop(0)
