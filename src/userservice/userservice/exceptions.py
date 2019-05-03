class DBException(Exception):
    """Base class for database exceptions."""
    pass


class ExistingUserException(DBException):
    """Raised when user with same username or email already exists."""
    pass


class WrongUsernameException(DBException):
    """Raised when there is no user with the given username."""
    pass


class UserActionException(DBException):
    """Raised when there is an error resulting from user action."""
    pass
