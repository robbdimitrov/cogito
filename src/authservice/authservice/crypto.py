import secrets

import bcrypt


def validate_password(password, password_hash):
    if isinstance(password_hash, str):
        password_hash = password_hash.encode('utf-8')
    return bcrypt.checkpw(password.encode('utf-8'), password_hash)


def generate_key():
    return secrets.token_urlsafe(21)
