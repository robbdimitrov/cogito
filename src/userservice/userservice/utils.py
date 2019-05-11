import re

from userservice import thoughts_pb2


def validate_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None


def dict_to_user(item):
    return thoughts_pb2.User(
        id=item['id'],
        username=item['username'],
        email=item['email'],
        name=item['name'],
        bio=item['bio'],
        date_created=item['date_created']
    )


def db_object_to_dict(item):
    return {
        'id': item[0],
        'username': item[1],
        'email': item[2],
        'name': item[3],
        'bio': item[4],
        'date_created': item[5]
    }
