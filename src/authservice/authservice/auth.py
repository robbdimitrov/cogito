import datetime
import bcrypt
import jwt
from http import HTTPStatus

from authservice import thoughts_pb2, thoughts_pb2_grpc
from authservice.utils import validate_email
from authservice.helpers import validate_token
from authservice.exceptions import AuthException


class AuthService(thoughts_pb2_grpc.AuthServiceServicer):
    def __init__(self, db_client, secret):
        self.db_client = db_client
        self.secret = secret

    # Helpers

    def validate_password(self, email, password):
        current_user = self.db_client.get_user_password_hash(email)

        if bcrypt.checkpw(password, current_user['password']) == False:
            raise AuthException(401, 'INVALID_CREDENTIALS', 'Wrong username or password.')

        return current_user

    def generate_tokens(self, session):
        if session is None:
            raise AuthException(401, 'INVALID_SESSION', 'Invalid session.')

        access_payload = {'sub': session['user_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}

        refresh_payload = {'sub': session['session_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}

        access_token = jwt.encode(access_payload, self.secret, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, self.secret, algorithm='HS256')

        return {
            'access_token': access_token,
            'refresh_token': refresh_token
        }

    # Token Generation

    def Login(self, request, context):
        """Validate login, create a new session,
           generate and return access and refresh tokens
        """

        email = request.email
        password = request.password
        user_agent = request.user_agent

        if email is not None and password is not None:
            if validate_email(email) == False:
                error = thoughts_pb2.Error(code=HTTPStatus.BAD_REQUEST,
                    error='INVALID_EMAIL',
                    message='Invalid email address.')
                return thoughts_pb2.AuthResponse(error=error)

            try:
                current_user = self.validate_password(email, password)
            except AuthException as e:
                error = thoughts_pb2.Error(code=e.code, error=e.error,
                    message=e.message)
                return thoughts_pb2.AuthResponse(error=error)

            session = self.db_client.create_session(current_user['id'], user_agent)
        else:
            error = thoughts_pb2.Error(code=HTTPStatus.BAD_REQUEST,
                error='MISSING_CREDENTIALS',
                message='Missing credentials.')
            return thoughts_pb2.AuthResponse(error=error)

        try:
            tokens = self.generate_tokens(session)
        except AuthException as e:
            error = thoughts_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return thoughts_pb2.AuthResponse(error=error)

        return thoughts_pb2.AuthResponse(
            token_type='bearer',
            access_token=tokens['access_token'],
            refresh_token=tokens['refresh_token']
        )

    def Refresh(self, request, context):
        """Validate refresh token, generate and
           return access and refresh tokens
        """

        refresh_token = request.token

        if refresh_token is not None:
            try:
                payload = jwt.decode(refresh_token, self.secret, algorithms='HS256')
            except jwt.ExpiredSignatureError:
                error = thoughts_pb2.Error(code=HTTPStatus.UNAUTHORIZED,
                    error='EXPIRED_TOKEN',
                    message='Refresh token is expired.')
                return thoughts_pb2.AuthResponse(error=error)

            session = self.db_client.get_session(payload['sub'])
        else:
            error = thoughts_pb2.Error(code=HTTPStatus.BAD_REQUEST,
                error='MISSING_CREDENTIALS',
                message='Missing credentials.')
            return thoughts_pb2.AuthResponse(error=error)

        try:
            tokens = self.generate_tokens(session)
        except AuthException as e:
            error = thoughts_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return thoughts_pb2.AuthResponse(error=error)

        return thoughts_pb2.AuthResponse(
            token_type='bearer',
            access_token=tokens['access_token'],
            refresh_token=tokens['refresh_token']
        )

    # Validation

    def Validate(self, request, context):
        """Validate access token"""

        try:
            payload = validate_token(request.token, self.secret)
        except AuthException as e:
            error = thoughts_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return thoughts_pb2.Status(error=error)

        return thoughts_pb2.AuthStatus(user_id=payload['user_id'])

    def ValidatePassword(self, request, context):
        """Validate password"""

        try:
            self.validate_password(request.email, request.password)
        except AuthException as e:
            error = thoughts_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return thoughts_pb2.Status(error=error)

        return thoughts_pb2.Status(message='Credentials validated.')
