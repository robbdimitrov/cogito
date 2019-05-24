from http import HTTPStatus

from userservice import thoughts_pb2, thoughts_pb2_grpc
from userservice import exceptions


class FollowService(thoughts_pb2_grpc.FollowServiceServicer):
    def __init__(self, db_client, auth_client):
        self.db_client = db_client
        self.auth_client = auth_client

    def GetFollowing(self, request, context):
        """Returns users following the user."""

        username = request.username
        page = request.page
        limit = request.limit

        users = self.db_client.get_following(username, page, limit)

        return thoughts_pb2.Users(users=users)

    def GetFollowers(self, request, context):
        """Returns users followed by the user."""

        username = request.username
        page = request.page
        limit = request.limit

        users = self.db_client.get_followers(username, page, limit)

        return thoughts_pb2.Users(users=users)

    def Follow(self, request, context):
        """Follows or unfollows a user with the current user."""

        response = self.auth_client.validate(request.token)

        if response.error is not None:
            return thoughts_pb2.Status(error=response.error)

        user_id = response.user_id
        username = request.username

        try:
            self.db_client.follow_user(username, user_id)
        except exceptions.DbException as e:
            error = thoughts_pb2.Error(code=HTTPStatus.BAD_REQUEST,
                error='BAD_REQUEST',
                message=str(e))
            return thoughts_pb2.Status(error=error)
        else:
            return thoughts_pb2.Status(message='Followed user.')

    def Unfollow(self, request, context):
        """Unfollows a user with the current user."""

        response = self.auth_client.validate(request.token)

        if response.error is not None:
            return thoughts_pb2.Status(error=response.error)

        user_id = response.user_id
        username = request.username

        self.db_client.unfollow_user(username, user_id)

        return thoughts_pb2.Status(message='Unfollowed user.')
