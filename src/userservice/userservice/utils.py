import re


def is_valid_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None
