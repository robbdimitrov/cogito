from userservice import thoughts_pb2, thoughts_pb2_grpc
from userservice.utils import dict_to_user
from userservice.auth_client import get_auth_stub
from userservice import exceptions


class FollowService(thoughts_pb2_grpc.FollowServiceServicer):
    def __init__(self, db_client):
        self.db_client = db_client

    def GetFollowing(self, request, context):
        """Returns users following the user."""

        username = request.username
        page = request.page_number or 0
        limit = request.results_per_page or 20

        users = self.db_client.get_following(username, page, limit)
        users = [dict_to_user(user) for user in users]

        return thoughts_pb2.Users(users=users)

    def GetFollowers(self, request, context):
        """Returns users followed by the user."""

        username = request.username
        page = request.page_number or 0
        limit = request.results_per_page or 20

        users = self.db_client.get_followers(username, page, limit)
        users = [dict_to_user(user) for user in users]

        return thoughts_pb2.Users(users=users)

    def Follow(self, request, context):
        """Follows or unfollows a user with the current user."""

        stub = get_auth_stub()
        response = stub.Validate(thoughts_pb2.AuthRequest(token=request.token))

        if response.error is not None:
            return thoughts_pb2.UserResponse(error=response.error)

        user_id = response.user_id
        username = request.username

        try:
            self.db_client.follow_user(username, user_id)
        except exceptions.DbException as e:
            error = thoughts_pb2.Error(code=400, error='BAD_REQUEST',
                message=str(e))
            return thoughts_pb2.Status(error=error)
        else:
            return thoughts_pb2.Status(message='Followed user.')

    def Unfollow(self, request, context):
        """Unfollows a user with the current user."""

        stub = get_auth_stub()
        response = stub.Validate(thoughts_pb2.AuthRequest(token=request.token))

        if response.error is not None:
            return thoughts_pb2.UserResponse(error=response.error)

        user_id = response.user_id
        username = request.username

        self.db_client.unfollow_user(username, user_id)

        return thoughts_pb2.Status(message='Unfollowed user.')
