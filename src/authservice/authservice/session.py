import datetime
import os

from flask import (
    Blueprint, request, make_response, jsonify
)
from werkzeug.security import check_password_hash

import jwt

from authservice import db_client
from authservice.utils import validate_email


bp = Blueprint('session', __name__)


@bp.route('/session', methods=['POST'])
def create_session(username):
    """Create a new access and refresh tokens."""

    secret = os.getenv('JWT_SECRET')
    content = request.get_json()

    refresh_token = content.get('refreshToken')
    email = content.get('email')
    password = content.get('password')

    session = None

    if email is not None and password is not None:
        if validate_email == False:
            error = {'code': 400, 'error': 'INVALID_EMAIL', 'message': 'Invalid email address.'}
            return make_response(jsonify({'error': error}), 400)

        # TODO: Move password validation to RPC call
        current_user = db_client.get_user_password_hash(username)
        if check_password_hash(current_user['password'], password) == False:
            error = {'code': 401, 'error': 'INVALID_CREDENTIALS', 'message': 'Wrong username or password.'}
            return make_response(jsonify({'error': error}), 401)

        session = db_client.create_session(current_user['id'])
    elif refresh_token is not None:
        try:
            payload = jwt.decode(refresh_token, secret, algorithms='HS256')
        except jwt.ExpiredSignatureError:
            error = {'code': 401, 'error': 'EXPIRED_TOKEN', 'message': 'Refresh token is expired.'}
            return make_response(jsonify({'error': error}), 401)

        session = db_client.get_session(payload['sessionId'])
    else:
        error = {'code': 400, 'error': 'MISSING_CREDENTIALS', 'message': 'Missing credentials.'}
        return make_response(jsonify({'error': error}), 400)

    if session is None:
        error = {'code': 401, 'error': 'INVALID_SESSION', 'error_description': 'Invalid session.'}
        return make_response({'error': error}, 401)

    access_payload = {'userId': session['user_id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}

    refresh_payload = {'sessionId': session['session_id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}

    access_token = jwt.encode(access_payload, secret, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

    return make_response(jsonify({'token_type': 'bearer',
        'access_token': access_token,
        'refresh_token': refresh_token}), 200)


# TODO: validate email, create a new session in the db, create and return tokens
# TODO: return invalid email/ invalid request when all else fails
# TODO: create RPC call for the validity of the token


@bp.route('/session', methods=['DELETE'])
def delete_session(username):
    """Delete a session with a given token."""
    return make_response(jsonify({'response': 'Deleted session.'}), 200)
