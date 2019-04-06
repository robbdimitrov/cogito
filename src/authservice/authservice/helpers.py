import re

def validate_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None
