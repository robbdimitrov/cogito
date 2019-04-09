from flask import (
    Blueprint, request, make_response, jsonify
)
import datetime
import jwt
import os

from authservice import db_client


bp = Blueprint('session', __name__)


@bp.route('/session', methods=['POST'])
def create_session(username):
    """Create a new access and refresh tokens."""

    content = request.get_json()

    refresh_token = content.get('refreshToken')
    secret = os.getenv('JWT_SECRET')

    if refresh_token is not None:
        try:
            payload = jwt.decode(refresh_token, secret, algorithms='HS256')
        except jwt.ExpiredSignatureError:
            error = {'code': 401, 'error': 'expired_token', 'error_description': 'Refresh token is expired.'}
            return make_response(jsonify({'error': error}), 401)

        session_id = payload['sessionId']

        session = db_client.get_session(session_id)

        if session is None:
            error = {'code': 401, 'error': 'invalid_session', 'error_description': 'Invalid session.'}
            return make_response({'error': error}, 401)

        access_payload = {'userId': session['user_id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}

        refresh_payload = {'sessionId': session['session_id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}

        access_token = jwt.encode(access_payload, secret, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

        make_response(jsonify({'token_type': 'bearer',
            'access_token': access_token,
            'refresh_token': refresh_token}), 200)

    username = content.get('username')
    email = content.get('email')

    # TODO: validate email, create a new session in the db, create and return tokens
    # TODO: return invalid email/ invalid request when all else fails
    # TODO: create DB methods
    # TODO: simplify the code, extract to additional methods
    # TODO: create RPC call for the validity of the token

    return make_response(jsonify({'response': 'Created session.'}), 200)


@bp.route('/session', methods=['DELETE'])
def delete_session(username):
    """Delete a session with a given token."""
    return make_response(jsonify({'response': 'Deleted session.'}), 200)
