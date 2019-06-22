import os

from userservice.server import Server


port = os.getenv('PORT')
db_uri = os.getenv('DATABASE_URI')
auth_uri = os.getenv('AUTH_SERVICE_ADDR')

def create_app():
    app = Server(port, db_uri, auth_uri)
    return app
