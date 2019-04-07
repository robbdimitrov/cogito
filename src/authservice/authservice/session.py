from flask import (
    Blueprint, request, make_response, jsonify
)

from authservice import db_client, status
from authservice.db_client import DBException


bp = Blueprint('session', __name__)
