import re

from authservice import auth_service_pb2


def validate_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None


def object_to_session(item):
    return auth_service_pb2.Session(
        id=item['id'],
        name=item['name'],
        user_agent=item['user_agent'],
        user_id=item['user_id'],
        date_created=item['date_created']
    )
