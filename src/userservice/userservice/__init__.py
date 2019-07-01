import os

from userservice.server import Server


def create_app():
    port = os.getenv('PORT')
    db_uri = os.getenv('DATABASE_URI')
    auth_uri = os.getenv('AUTH_SERVICE_ADDR')

    app = Server(port, db_uri, auth_uri)
    return app
