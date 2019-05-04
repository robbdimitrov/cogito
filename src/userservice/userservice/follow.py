from userservice import user_service_pb2_grpc, user_service_pb2, types_pb2
from userservice.utils import object_to_user


class FollowService(user_service_pb2_grpc.FollowServiceServicer):
    def __init__(self, db_client):
        self.db_client = db_client

    def GetFollowing(self, request, context):
        """Returns users following the user."""

        username = request.username
        page = request.page_number or 0
        limit = request.results_per_page or 20

        users = self.db_client.get_following(username, page, limit)
        users = [object_to_user(user) for user in users]

        return user_service_pb2.Users(users=users)

    def GetFollowers(self, request, context):
        """Returns users followed by the user."""

        username = request.username
        page = request.page_number or 0
        limit = request.results_per_page or 20

        users = self.db_client.get_followers(username, page, limit)
        users = [object_to_user(user) for user in users]

        return user_service_pb2.Users(users=users)

    def Follow(self, request, context):
        """Follows or unfollows a user with the current user."""

        user_id = request.user_id
        username = request.username

        # TODO: validate token and id

        try:
            self.db_client.follow_user(username, user_id)
        except db_client.DBException as e:
            error = {'code': 400, 'error': 'BAD_REQUEST', 'message': str(e)}
            return make_response(jsonify(error), 400)
        else:
            return make_response(jsonify({'message': 'Followed user.'}), 200)

    def Unfollow(self, request, context):
        """Unfollows a user with the current user."""

        user_id = '2' # TODO: Get id of current user

        db_client.unfollow_user(username, user_id)

        return make_response(jsonify({'message': 'Unfollowed user.'}), 200)
