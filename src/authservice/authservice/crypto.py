import secrets

import bcrypt


def validate_password(user, password):
    return bcrypt.checkpw(password, user['password'])


def generate_key():
    return secrets.token_urlsafe(21)
