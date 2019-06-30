from http import HTTPStatus

from userservice import thoughts_pb2, thoughts_pb2_grpc
from userservice.exceptions import (
    DbException,
    UserNotFoundException
)


class FollowService(thoughts_pb2_grpc.FollowServiceServicer):
    def __init__(self, db_client, auth_client):
        self.db_client = db_client
        self.auth_client = auth_client

    def GetFollowing(self, request, context):
        """Returns users following the user."""

        user_id = request.user_id
        page = request.page
        limit = request.limit

        users = self.db_client.get_following(user_id, page, limit)

        return thoughts_pb2.Users(users=users)

    def GetFollowingIds(self, request, context):
        """Returns the ids of users followed by the user."""

        user_id = request.user_id

        ids = self.db_client.get_following_ids(user_id)

        return thoughts_pb2.Identifiers(ids=ids)

    def GetFollowers(self, request, context):
        """Returns users followed by the user."""

        user_id = request.user_id
        page = request.page
        limit = request.limit

        users = self.db_client.get_followers(user_id, page, limit)

        return thoughts_pb2.Users(users=users)

    def GetFollowersIds(self, request, context):
        """Returns the ids of users following the user."""

        user_id = request.user_id

        ids = self.db_client.get_followers_ids(user_id)

        return thoughts_pb2.Identifiers(ids=ids)

    def FollowUser(self, request, context):
        """Follows or unfollows a user with the current user."""

        response = self.auth_client.validate(request.token)

        if response.error.code != 0:
            return thoughts_pb2.Status(error=response.error)

        current_id = response.user_id
        user_id = request.user_id

        try:
            self.db_client.follow_user(user_id, current_id)
        except UserNotFoundException as e:
            error = thoughts_pb2.Error(code=HTTPStatus.NOT_FOUND,
                error='NOT_FOUND',
                message=str(e))
            return thoughts_pb2.Status(error=error)
        except DbException as e:
            error = thoughts_pb2.Error(code=HTTPStatus.BAD_REQUEST,
                error='BAD_REQUEST',
                message=str(e))
            return thoughts_pb2.Status(error=error)
        else:
            return thoughts_pb2.Status(message='User followed.')

    def UnfollowUser(self, request, context):
        """Unfollows a user with the current user."""

        response = self.auth_client.validate(request.token)

        if response.error.code != 0:
            return thoughts_pb2.Status(error=response.error)

        follower_id = response.user_id
        user_id = request.user_id

        self.db_client.unfollow_user(user_id, follower_id)

        return thoughts_pb2.Status(message='User unfollowed.')
