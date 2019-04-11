import psycopg2

from authservice import db


class DBException(Exception):
    """Base class for database exceptions."""
    pass


def create_session(user_id, name):
    conn = db.get_db()
    cur = conn.cursor()

    try:
        cur.execute('INSERT INTO thoughts.sessions(name, user_id) \
            VALUES(%s, %s) RETURNING id, user_id, name, time_format(date_created)',
            (name, user_id))
        result = cur.fetchone()
        conn.commit()
    except psycopg2.Error as e:
        print(f'Error creating user: {str(e)}')
        raise DBException('Error while writing to the database.')
    finally:
        cur.close()

    session = {
        'id': result[0],
        'user_id': result[1],
        'name': result[2],
        'date_created': result[3]
    }
    return session


def get_session(session_id):
    conn = db.get_db()
    cur = conn.cursor()

    cur.execute('SELECT id, user_id, name, time_format(date_created) \
        FROM thoughts.sessions WHERE id = %s', (session_id,))
    result = cur.fetchone()
    cur.close()

    if result is None:
        return None

    session = {
        'id': result[0],
        'user_id': result[1],
        'name': result[2],
        'date_created': result[3]
    }
    return session


def get_user_sessions(user_id):
    conn = db.get_db()
    cur = conn.cursor()

    cur.execute('SELECT id, user_id, name, time_format(date_created) \
        FROM thoughts.sessions WHERE user_id = %s', (user_id,))
    result = cur.fetchall()
    cur.close()

    if result is None:
        return None

    session = {
        'id': result[0],
        'user_id': result[1],
        'name': result[2],
        'date_created': result[3]
    }
    return session


def delete_session(session_id):
    conn = db.get_db()
    cur = conn.cursor()

    cur.execute('DELETE FROM thoughts.sessions WHERE id = %s', (session_id,))
    conn.commit()
    cur.close()


def get_user_password_hash(username):
    conn = db.get_db()
    cur = conn.cursor()

    cur.execute('SELECT id, password, FROM thoughts.sessions \
        WHERE username = %s', (username,))
    result = cur.fetchone()
    cur.close()

    if result is None:
        return None

    user = {
        'id': result[0],
        'password': result[1]
    }
    return user
