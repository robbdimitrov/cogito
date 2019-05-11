import os

from authservice.server import Server


def create_app():
    app = Server()
    app.config['DB_URI'] = os.getenv('DB_URI')
    app.config['SECRET'] = os.getenv('SECRET')
    app.config['PORT'] = os.getenv('PORT')
    return app
