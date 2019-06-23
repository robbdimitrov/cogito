import os

from authservice.server import Server


def create_app():
    port = os.getenv('PORT')
    db_uri = os.getenv('DATABASE_URI')
    secret = os.getenv('SECRET')

    app = Server(port, db_uri, secret)
    return app
