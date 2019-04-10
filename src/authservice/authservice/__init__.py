import os

from flask import Flask

from authservice import (
    db, session
)


def create_app():
    app = Flask(__name__)
    app.config['DATABASE_URI'] = os.getenv('DATABASE_URI')
    app.config['JWT_SECRET'] = os.getenv('JWT_SECRET')

    # Register the database client
    db.init_app(app)

    # Register the api routes
    app.register_blueprint(session.bp)

    return app
