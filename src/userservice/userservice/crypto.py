import bcrypt


def generate_hash(password):
    return bcrypt.hashpw(password, bcrypt.gensalt())


def validate_password(user, password):
    return bcrypt.checkpw(password, user['password'])
