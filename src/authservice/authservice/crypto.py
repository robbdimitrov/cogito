import secrets

import bcrypt


def validate_password(password, password_hash):
    return bcrypt.checkpw(password, password_hash)


def generate_key():
    return secrets.token_urlsafe(21)
