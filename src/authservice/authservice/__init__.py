import os

from authservice.server import Server


def create_app():
    port = os.getenv('PORT')
    db_url = os.getenv('DATABASE_URL')
    secret = os.getenv('SECRET')

    app = Server(port, db_url, secret)
    return app
