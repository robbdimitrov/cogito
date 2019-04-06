import os

from flask import Flask

from authservice import (
    db, user
)


def create_app():
    app = Flask(__name__)
    app.config['DATABASE_URI'] = os.getenv('DATABASE_URI')

    # Register the database client
    db.init_app(app)

    # Register the api routes
    app.register_blueprint(user.bp)

    return app
