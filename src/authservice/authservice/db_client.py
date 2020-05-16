import sys

from psycopg2 import pool, DatabaseError

from authservice.mappers import map_session
from authservice import logger


class DbClient:
    def __init__(self, db_url):
        try:
            self.db = pool.ThreadedConnectionPool(1, 10, db_url)
        except DatabaseError as e:
            logger.print(f'Unable to connect to database: {e}')
            sys.exit(1)

    def close(self):
        self.db.closeall()

    def get_user(self, email):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, password FROM users WHERE email = %s'
            cur.execute(query, (email,))
            result = cur.fetchone()
            return {
                'id': result[0],
                'password': result[1]
            }
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def create_session(self, session_id, user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'INSERT INTO sessions (id, user_id) VALUES (%s, %s)\
                RETURNING id, user_id, time_format(created) AS created'
            cur.execute(query, (session_id, user_id))
            result = cur.fetchone()
            conn.commit()
            return map_session(result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def get_session(self, session_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, user_id, time_format(created) AS created\
                FROM sessions WHERE id = %s'
            cur.execute(query, (session_id,))
            result = cur.fetchone()
            if result is None:
                return None
            return map_session(result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def delete_session(self, session_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'DELETE FROM sessions WHERE id = %s'
            cur.execute(query, (session_id,))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)
