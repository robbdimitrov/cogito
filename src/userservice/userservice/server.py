import grpc
from concurrent import futures
import time

from userservice import user_service_pb2_grpc
from userservice.user_service import UserService
from userservice.db import Database
from userservice.db_client import DBClient


class Server:
    def __init__(self):
        self.config = {}

    def create_user_service(self):
        db = Database(self.config['DB_URI'])
        db_client = DBClient(db)
        user_service = UserService(db_client)
        return user_service

    def create_server(self):
        auth_service = self.create_user_service()

        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        user_service_pb2_grpc.add_UserServiceServicer_to_server(auth_service, server)

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
