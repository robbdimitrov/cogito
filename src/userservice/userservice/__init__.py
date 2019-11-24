import os

from userservice.server import Server


def create_app():
    port = os.getenv('PORT')
    db_url = os.getenv('DATABASE_URL')
    auth_url = os.getenv('AUTH_SERVICE_ADDR')

    app = Server(port, db_url, auth_url)
    return app
