import re

from userservice import thoughts_pb2


def validate_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None

def object_to_user(item):
    return thoughts_pb2.User(
        id=item['id'],
        username=item['username'],
        email=item['email'],
        name=item['name'],
        bio=item['bio'],
        reg_date=item['reg_date']
    )
