from flask import (
    Blueprint, request, make_response, jsonify
)

from userservice import db_client


bp = Blueprint('follow', __name__)

@bp.route('/users/<username>/followers', methods=['GET'])
def get_followers(username):
    """Returns users followed by the user."""

    page = request.args.get('page') or 0
    limit = request.args.get('limit') or 20

    users = db_client.get_followers(username, page, limit)

    return make_response(jsonify(users), 200)


@bp.route('/users/<username>/following', methods=['GET'])
def get_following(username):
    """Returns users following the user."""

    page = request.args.get('page') or 0
    limit = request.args.get('limit') or 20

    users = db_client.get_following(username, page, limit)

    return make_response(jsonify(users), 200)


@bp.route('/users/<username>/following', methods=['POST'])
def follow_user(username):
    """Follows or unfollows a user with the current user."""

    user_id = '2' # TODO: Get id of current user

    try:
        db_client.follow_user(username, user_id)
    except db_client.DBException as e:
        error = {'code': 400, 'error': 'BAD_REQUEST', 'message': str(e)}
        return make_response(jsonify(error), 400)
    else:
        return make_response(jsonify({'message': 'Followed user.'}), 200)


@bp.route('/users/<username>/following', methods=['DELETE'])
def unfollow_user(username):
    """Unfollows a user with the current user."""

    user_id = '2' # TODO: Get id of current user

    db_client.unfollow_user(username, user_id)

    return make_response(jsonify({'message': 'Unfollowed user.'}), 200)
