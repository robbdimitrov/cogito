import psycopg2
import logging

from authservice import thoughts_pb2


class DbException(Exception):
    """Base class for database exceptions."""
    pass


class DbClient:
    def __init__(self, db):
        self.db = db

    def create_session(self, user_id, user_agent):
        conn = self.db.get_conn()
        cur = conn.cursor()

        try:
            cur.execute('INSERT INTO thoughts.sessions(user_id, user_agent) \
                VALUES(%s, %s) RETURNING id, user_id, user_agent, time_format(date_created)',
                (user_id, user_agent))
            result = cur.fetchone()
            conn.commit()
        except psycopg2.Error as e:
            logging.error(f'Error creating user: {str(e)}')
            raise DbException('Error while writing to the database.')
        finally:
            cur.close()

        session = thoughts_pb2.Session(id=result[0],
            user_id=result[1],
            user_agent=result[2],
            date_created=result[3])
        return session

    def get_session(self, session_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, user_id, user_agent, time_format(date_created) \
            FROM thoughts.sessions WHERE id = %s', (session_id,))
        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        session = thoughts_pb2.Session(id=result[0],
            user_id=result[1],
            user_agent=result[2],
            date_created=result[3])
        return session

    def get_user_sessions(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, user_id, user_agent, time_format(date_created) \
            FROM thoughts.sessions WHERE user_id = %(id)s OR \
            user_id = (SELECT id FROM thoughts.users WHERE username = %(id)s)',
            {'id': user_id})
        result = cur.fetchall()
        cur.close()

        if result is None:
            return None

        sessions = []

        for row in result:
            session = thoughts_pb2.Session(id=row[0],
                user_id=row[1],
                user_agent=row[2],
                date_created=row[3])
            sessions.append(session)

        return sessions

    def delete_session(self, session_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.sessions WHERE id = %s', (session_id,))
        conn.commit()
        cur.close()

    def get_user_password_hash(self, username):
        conn = self.db.get_conn()
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
