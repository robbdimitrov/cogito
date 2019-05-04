import bcrypt


def validate_session(self, auth_header):
    """Helper method for token validation"""

    if auth_header is None:
        raise AuthException(400, 'INVALID_TOKEN', 'Authentication token not provided.')

    auth_token = auth_header.split(' ')[1]

    try:
        payload = jwt.decode(auth_token, self.secret, algorithms='HS256')
    except jwt.ExpiredSignatureError:
        raise AuthException(401, 'EXPIRED_TOKEN', 'Authorization token is expired.')

    return payload

def validate_password(self, email, password):
    current_user = self.db_client.get_user_password_hash(email)

    if bcrypt.checkpw(password, current_user['password']) == False:
        raise AuthException(401, 'INVALID_CREDENTIALS', 'Wrong username or password.')

    return current_user
