from grpc import Status, StatusCode, ServicerContext

from authservice import thoughts_pb2, thoughts_pb2_grpc
from authservice.crypto import generate_key, validate_password
from authservice import logger


class Controller(thoughts_pb2_grpc.AuthServiceServicer):
    def __init__(self, db_client):
        self.db_client = db_client

    def CreateSession(self, request, context):
        if len(request.email) == 0 or len(request.password) == 0:
            context.abort(
                StatusCode.INVALID_ARGUMENT,
                'Missing credentials.'
            )

        try:
            user = self.db_client.get_user(request.email)

            if validate_password(user, request.password) == False:
                context.abort(
                    StatusCode.UNAUTHENTICATED,
                    'Incorrect email or password.'
                )

            return self.db_client.create_session(generate_key(), user['id'])
        except Exception as e:
            logger.print(f'Creating session failed: {e}')
            context.abort(StatusCode.INTERNAL)

    def GetSession(self, request, context):
        try:
            session = self.db_client.get_session(request.session_id)

            if session is None:
                context.abort(StatusCode.UNAUTHENTICATED)

            return session
        except Exception as e:
            logger.print(f'Getting session failed: {e}')
            context.abort(StatusCode.INTERNAL)

    def DeleteSession(self, request, context):
        try:
            self.db_client.delete_session(request.session_id)
            return thoughts_pb2.Empty()
        except Exception as e:
            logger.print(f'Deleting session failed: {e}')
            context.abort(StatusCode.INTERNAL)
