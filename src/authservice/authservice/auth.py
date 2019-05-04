import datetime
import bcrypt
import jwt

from authservice import auth_service_pb2_grpc, auth_service_pb2, types_pb2
from authservice.utils import validate_email, object_to_session


class AuthException(Exception):
    """Exception used for token validation"""

    def __init__(self, code, error, message):
        self.code = code
        self.error = error
        self.message = message


class AuthService(auth_service_pb2_grpc.AuthServiceServicer):
    def __init__(self, db_client, secret):
        self.db_client = db_client
        self.secret = secret

    # Helpers

    def validate_session(self, auth_header):
        """Helper method for token validation"""

        if auth_header is None:
            raise AuthException(400, 'INVALID_TOKEN', 'Authentication token not provided.')

        auth_token = auth_header.split(' ')[1]

        try:
            payload = jwt.decode(auth_token, self.secret, algorithms='HS256')
        except jwt.ExpiredSignatureError:
            raise AuthException(401, 'EXPIRED_TOKEN', 'Authorization token is expired.')

        return payload

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
                error = types_pb2.Error(code=400, error='INVALID_EMAIL',
                    message='Invalid email address.')
                return auth_service_pb2.AuthResponse(error=error)

            try:
                current_user = self.validate_password(email, password)
            except AuthException as e:
                error = types_pb2.Error(code=e.code, error=e.error,
                    message=e.message)
                return auth_service_pb2.AuthResponse(error=error)

            session = self.db_client.create_session(current_user['id'], user_agent)
        else:
            error = types_pb2.Error(code=400, error='MISSING_CREDENTIALS',
                message='Missing credentials.')
            return auth_service_pb2.AuthResponse(error=error)

        try:
            tokens = self.generate_tokens(session)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return auth_service_pb2.AuthResponse(error=error)

        return auth_service_pb2.AuthResponse(
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
                error = types_pb2.Error(code=401, error='EXPIRED_TOKEN',
                    message='Refresh token is expired.')
                return auth_service_pb2.AuthResponse(error=error)

            session = self.db_client.get_session(payload['sub'])
        else:
            error = types_pb2.Error(code=400, error='MISSING_CREDENTIALS',
                message='Missing credentials.')
            return auth_service_pb2.AuthResponse(error=error)

        try:
            tokens = self.generate_tokens(session)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return auth_service_pb2.AuthResponse(error=error)

        return auth_service_pb2.AuthResponse(
            token_type='bearer',
            access_token=tokens['access_token'],
            refresh_token=tokens['refresh_token']
        )

    # Validation

    def Validate(self, request, context):
        """Validate access token"""

        try:
            self.validate_session(request.token)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return types_pb2.Status(error=error)

        return types_pb2.Status(message='Valid token')

    def ValidatePassword(self, request, context):
        """Validate password"""

        try:
            self.validate_password(request.email, request.password)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return types_pb2.Status(error=error)

        return types_pb2.Status(message='Valid password')

    # Sessions

    def GetSessions(self, request, context):
        """Get all active sessions of the active user."""

        try:
            payload = self.validate_session(request.token)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return types_pb2.Status(error=error)

        sessions = self.db_client.get_user_sessions(payload['sub'])
        sessions = [object_to_session(item) for item in sessions]

        return auth_service_pb2.Sessions(sessions=sessions)

    def DeleteSession(self, request, context):
        """Delete a session with a given token."""

        try:
            payload = self.validate_session(request.token)
        except AuthException as e:
            error = types_pb2.Error(code=e.code, error=e.error,
                message=e.message)
            return types_pb2.Status(error=error)

        session_id = request.session_id

        if self.db_client.get_session(session_id)['user_id'] != payload['sub']:
            error = types_pb2.Error(code=403, error='FORBIDDEN',
                message='This action is forbidden.')
            return types_pb2.Status(error=error)

        self.db_client.delete_session(session_id)

        return types_pb2.Status(message='Deleted session.')
