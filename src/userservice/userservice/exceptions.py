class DbException(Exception):
    """Base class for database exceptions."""
    pass


class ExistingUserException(DbException):
    """Raised when user with same username or email already exists."""
    pass


class WrongUsernameException(DbException):
    """Raised when there is no user with the given username."""
    pass


class UserActionException(DbException):
    """Raised when there is an error resulting from user action."""
    pass
