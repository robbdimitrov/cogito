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
                return types_pb2.Status(error=error)

            # TODO: Move password validation to RPC call
            current_user = db_client.get_user_password_hash(email)
            if check_password_hash(current_user['password'], password) == False:
                error = {'code': 401, 'error': 'INVALID_CREDENTIALS',
                    'message': 'Wrong username or password.'}
                return make_response(jsonify({'error': error}), 401)

            session = db_client.create_session(current_user['id'], name)
        else:
            error = {'code': 400, 'error': 'MISSING_CREDENTIALS',
                'message': 'Missing credentials.'}
            return make_response(jsonify({'error': error}), 400)

        if session is None:
            error = {'code': 401, 'error': 'INVALID_SESSION',
                'message': 'Invalid session.'}
            return make_response({'error': error}, 401)

        access_payload = {'sub': session['user_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}

        refresh_payload = {'sub': session['session_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}

        access_token = jwt.encode(access_payload, secret, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

        return make_response(jsonify({'token_type': 'bearer',
            'access_token': access_token,
            'refresh_token': refresh_token}), 200)

    def Refresh(self, request, context):
        """Validate refresh token, generate and
           return access and refresh tokens
        """

        refresh_token = content.get('refresh_token')
        email = content.get('email')
        password = content.get('password')
        name = content.get('name')

        if email is not None and password is not None:
            if validate_email(email) == False:
                error = {'code': 400, 'error': 'INVALID_EMAIL',
                    'message': 'Invalid email address.'}
                return make_response(jsonify({'error': error}), 400)

            # TODO: Move password validation to RPC call
            current_user = db_client.get_user_password_hash(email)
            if check_password_hash(current_user['password'], password) == False:
                error = {'code': 401, 'error': 'INVALID_CREDENTIALS',
                    'message': 'Wrong username or password.'}
                return make_response(jsonify({'error': error}), 401)

            session = db_client.create_session(current_user['id'], name)
        elif refresh_token is not None:
            try:
                payload = jwt.decode(refresh_token, secret, algorithms='HS256')
            except jwt.ExpiredSignatureError:
                error = {'code': 401, 'error': 'EXPIRED_TOKEN',
                    'message': 'Refresh token is expired.'}
                return make_response(jsonify({'error': error}), 401)

            session = db_client.get_session(payload['sub'])
        else:
            error = {'code': 400, 'error': 'MISSING_CREDENTIALS',
                'message': 'Missing credentials.'}
            return make_response(jsonify({'error': error}), 400)

        if session is None:
            error = {'code': 401, 'error': 'INVALID_SESSION',
                'message': 'Invalid session.'}
            return make_response({'error': error}, 401)

        access_payload = {'sub': session['user_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}

        refresh_payload = {'sub': session['session_id'],
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}

        access_token = jwt.encode(access_payload, secret, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

        return make_response(jsonify({'token_type': 'bearer',
            'access_token': access_token,
            'refresh_token': refresh_token}), 200)

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
