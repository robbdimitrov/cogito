import os

from userservice import db, user, follow


def create_app():
    app = Flask(__name__)
    app.config['DATABASE_URI'] = os.getenv('DATABASE_URI')

    # Register the database client
    db.init_app(app)

    # Register the api routes
    app.register_blueprint(user.bp)
    app.register_blueprint(follow.bp)

    return app
