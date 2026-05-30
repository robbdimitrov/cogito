import re

from grpc import StatusCode


def is_valid_email(email):
    return re.fullmatch(r'[^@]+@[^@]+\.[^@]+', email) is not None


def get_user_id(context):
    metadata = dict(context.invocation_metadata() or [])
    user_id = metadata.get('user-id')
    if not user_id:
        context.abort(StatusCode.UNAUTHENTICATED, 'Unauthenticated.')
    return user_id
