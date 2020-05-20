import bcrypt


def generate_hash(password):
    return bcrypt.hashpw(password, bcrypt.gensalt())


def validate_password(password, password_hash):
    return bcrypt.checkpw(password, password_hash)
