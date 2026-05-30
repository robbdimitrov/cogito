import os
import sys

from psycopg2 import pool, DatabaseError

from authservice.mappers import map_session
from authservice import logger

DEFAULT_SESSION_TTL_DAYS = 7


def session_ttl_days():
    try:
        return max(1, int(os.getenv('SESSION_TTL_DAYS') or DEFAULT_SESSION_TTL_DAYS))
    except ValueError:
        return DEFAULT_SESSION_TTL_DAYS


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
            if result is None:
                return None
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
            self.delete_expired_sessions(cur)
            query = 'SELECT id, user_id, time_format(created) AS created\
                FROM sessions\
                WHERE id = %s AND created > now() - (%s * interval \'1 day\')'
            cur.execute(query, (session_id, session_ttl_days()))
            result = cur.fetchone()
            conn.commit()
            if result is None:
                return None
            return map_session(result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def get_sessions(self, user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            self.delete_expired_sessions(cur)
            query = 'SELECT id, user_id, time_format(created) AS created\
                FROM sessions\
                WHERE user_id = %s AND created > now() - (%s * interval \'1 day\')\
                ORDER BY created DESC'
            cur.execute(query, (user_id, session_ttl_days()))
            results = cur.fetchall()
            conn.commit()
            sessions = []
            for row in results:
                sessions.append({
                    'id': row[0],
                    'user_id': row[1],
                    'created': row[2]
                })
            return sessions
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def delete_expired_sessions(self, cur):
        query = 'DELETE FROM sessions WHERE created <= now() - (%s * interval \'1 day\')'
        cur.execute(query, (session_ttl_days(),))

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
