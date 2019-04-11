import datetime

from flask import (
    Blueprint, request, make_response, jsonify, current_app
)
from werkzeug.security import check_password_hash

import jwt

from authservice import db_client
from authservice.utils import validate_email


bp = Blueprint('session', __name__)


@bp.route('/session', methods=['POST'])
def create_session():
    """Create a new access and refresh tokens."""

    content = request.get_json()

    refresh_token = content.get('refresh_token')
    email = content.get('email')
    password = content.get('password')
    name = content.get('name')

    secret = current_app.config.get('JWT_SECRET')

    if email is not None and password is not None:
        if validate_email == False:
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


@bp.route('/session', methods=['GET'])
def get_sessions():
    """Get all active sessions of the active user."""

    auth_header = request.headers.get('Authorization')
    secret = current_app.config.get('JWT_SECRET')

    if auth_header is None:
        error = {'code': 400, 'error': 'INVALID_TOKEN',
            'message': 'Authentication token not provided.'}
        return make_response({'error': error}, 400)

    auth_token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(auth_token, secret, algorithms='HS256')
    except jwt.ExpiredSignatureError:
        error = {'code': 401, 'error': 'EXPIRED_TOKEN',
            'message': 'Authorization token is expired.'}
        return make_response(jsonify({'error': error}), 401)

    sessions = db_client.get_user_sessions(payload['sub'])

    return make_response(jsonify(sessions), 200)


@bp.route('/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session with a given token."""

    auth_header = request.headers.get('Authorization')
    secret = current_app.config.get('JWT_SECRET')

    if auth_header is None:
        error = {'code': 400, 'error': 'INVALID_TOKEN',
            'message': 'Authentication token not provided.'}
        return make_response({'error': error}, 400)

    auth_token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(auth_token, secret, algorithms='HS256')
    except jwt.ExpiredSignatureError:
        error = {'code': 401, 'error': 'EXPIRED_TOKEN',
            'message': 'Authorization token is expired.'}
        return make_response(jsonify({'error': error}), 401)

    if db_client.get_session(session_id)['user_id'] != payload['sub']:
        error = {'code': 403, 'error': 'FORBIDDEN',
            'message': 'This action is forbidden.'}
        return make_response(jsonify({'error': error}), 403)

    db_client.delete_session(session_id)

    return make_response(jsonify({'response': 'Deleted session.'}), 200)
