from flask import Blueprint, request, make_response, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from userservice import db_client
from userservice.utils import validate_email


bp = Blueprint('user', __name__)

@bp.route('/users', methods=['POST'])
def create_user():
    """Validates input and creates new user account."""

    content = request.get_json()

    username = content.get('username')
    email = content.get('email')
    name = content.get('name') or ''
    password = content.get('password')

    error_message = None
    error_type = None

    if username is None or username == '':
        error_message = 'Username is missing.'
        error_type = 'MISSING_USERNAME'
    elif email is None or email == '':
        error_message = 'Email is missing.'
        error_type = 'MISSING_EMAIL'
    elif validate_email(email) == False:
        error_message = 'Invalid email address.'
        error_type = 'INVALID_EMAIL'
    elif password is None:
        error_message = 'Password is missing'
        error_type = 'MISSING_PASSWORD'

    if error_message is not None:
        error = error = {'code': 400, 'error': error_type, 'message': error_message}
        return make_response(jsonify(error), 400)

    password = generate_password_hash(password)

    try:
        user = db_client.create_user(username, email, name, password)
    except db_client.ExistingUserException as e:
        error = {'code': 400, 'error': 'USER_EXISTS', 'message': str(e)}
        return make_response(jsonify(error), 400)
    except db_client.DBException as e:
        error = {'code': 400, 'error': 'BAD_REQUEST', 'message': str(e)}
        return make_response(jsonify(error), 400)

    return make_response(jsonify(user), 201)


@bp.route('/users/<username>', methods=['GET'])
def get_user(username):
    """Gets user with username from the database."""

    user = db_client.get_user(username)

    if user is None:
        error = {'code': 404, 'error': 'NOT_FOUND', 'message': 'User not found.'}
        return make_response(jsonify(error), 404)

    return make_response(jsonify(user), 200)


@bp.route('/users/<username>', methods=['PUT', 'UPDATE'])
def update_user(username):
    """Updated user with passed updated information"""
    # TODO: Check for valid auth token with decorator

    content = request.get_json()
    changes = {}
    allowed_keys = ['username', 'email', 'name', 'bio', 'password']

    for key, value in content.items():
        if key in allowed_keys:
            changes[key] = value

    error_message = None
    error_type = None

    if 'password' in changes:
        if 'current_password' not in changes:
            error_message = 'Current password is missing.'
            error_type = 'MISSING_PASSWORD'
        else:
            password = changes.get('password')
            current_password = changes.get('currentPassword')

            saved_password = db_client.get_user_password_hash(username)['password']
            if check_password_hash(saved_password, current_password) == False:
                error_message = 'Wrong password.'
                error_type = 'WRONG_PASSWORD'

            password = generate_password_hash(password)
            changes['password'] = password

    email = content.get('email')

    if email is not None and validate_email(email) == False:
        error = 'Invalid email address.'
        error_type = 'INVALID_EMAIL'

    if error is not None:
        error = {'code': 400, 'error': error_type, 'message': error_message}
        return make_response(jsonify(error), 400)

    try:
        db_client.update_user(username, changes)
    except:
        error = {'code': 400, 'error': 'BAD_REQUEST', 'message': 'User update failed.'}
        return make_response(jsonify(error), 400)
    else:
        return make_response(jsonify({'message': f'Updated user {username}.'}), 200)


@bp.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """Deleted a user if it matches the logged in user."""
    # TODO: Check for valid auth token with decorator
    db_client.delete_user(username)

    return make_response(jsonify({'message': f'Deleted user {username}.'}), 200)
