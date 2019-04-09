from flask import (
    Blueprint, request, make_response, jsonify
)
import jwt

from authservice import db_client, status
from authservice.db_client import DBException


bp = Blueprint('session', __name__)


@bp.route('/session', methods=['POST'])
def create_session(username):
    """Follows or unfollows a user with the current user."""

    # encoded = jwt.encode({'some': 'payload'}, 'secret', algorithm='HS256')
    # jwt.decode(encoded, 'secret', algorithms=['HS256'])
    return make_response(jsonify({'response': 'Created session.'}), status.OK)


@bp.route('/session', methods=['DELETE'])
def delete_session(username):
    """Delete a session with a given token."""
    return make_response(jsonify({'response': 'Deleted session.'}), status.OK)
