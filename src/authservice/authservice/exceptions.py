class AuthException(Exception):
    """Exception used for token validation"""

    def __init__(self, code, error, message):
        self.code = code
        self.error = error
        self.message = message
