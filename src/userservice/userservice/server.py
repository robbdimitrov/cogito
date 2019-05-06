import grpc
from concurrent import futures
import time
import logging

from userservice import thoughts_pb2_grpc
from userservice.user import UserService
from userservice.follow import FollowService
from userservice.db import Database
from userservice.db_client import DBClient


class Server:
    def __init__(self):
        self.config = {}
        self.db_client = None

    def get_db_client(self):
        if self.db_client is None:
            db = Database(self.config['DB_URI'])
            self.db_client = DBClient(db)
        return self.db_client

    def create_user_service(self):
        db_client = self.get_db_client()
        service = UserService(db_client)
        return service

    def create_follow_service(self):
        db_client = self.get_db_client()
        service = FollowService(db_client)
        return service

    def create_server(self):
        db_client = self.get_db_client()
        user_service = UserService(db_client)
        follow_service = FollowService(db_client)

        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        thoughts_pb2_grpc.add_UserServiceServicer_to_server(user_service, server)
        thoughts_pb2_grpc.add_FollowServiceServicer_to_server(follow_service, server)

        server.add_insecure_port(f'[::]:{self.config["PORT"]}')

        return server

    def serve(self):
        server = self.create_server()
        server.start()
        logging.info(f'Server running on port {self.config["PORT"]}')
        try:
            while True:
                time.sleep(60 * 60 * 24)
        except KeyboardInterrupt:
            server.stop(0)
