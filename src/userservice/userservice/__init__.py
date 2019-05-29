import os

from userservice.server import Server


def create_app():
    app = Server(5010)
    app.config['AUTH_URI'] = os.getenv('AUTH_URI')
    app.config['DB_URI'] = os.getenv('DB_URI')
    return app
