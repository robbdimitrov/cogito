import os

from userservice.server import Server


def create_app():
    app = Server()
    app.config['AUTH_URI'] = os.getenv('AUTH_URI')
    app.config['DB_URI'] = os.getenv('DB_URI')
    app.config['PORT'] = os.getenv('PORT')
    return app
