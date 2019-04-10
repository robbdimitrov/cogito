import psycopg2

from authservice import db


class DBException(Exception):
    pass


def get_session(session_id):
    return {'id': 10, 'user_id': 1}


def get_user_sessions(user_id):
    return []


def create_session(user_id):
    return {'id': 10, 'user_id': 1}


def delete_session(session_id):
    pass


def get_user_password_hash(username):
    conn = db.get_db()
    cur = conn.cursor()

    cur.execute('SELECT id, password, FROM thoughts.users WHERE username = %s',
        (username,))
    result = cur.fetchone()
    cur.close()

    if result is None:
        return None

    user = {
        'id': result[0],
        'password': result[1]
    }
    return user
