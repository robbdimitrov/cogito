import os

from authservice.server import Server

port = os.getenv('PORT')
db_uri = os.getenv('DATABASE_URI')
secret = os.getenv('SECRET')

def create_app():
    app = Server(port, db_uri, secret)
    return app
