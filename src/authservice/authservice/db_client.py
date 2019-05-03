import asyncpg
import asyncio


class DBException(Exception):
    """Base class for database exceptions."""
    pass


class DBClient:
    def __init__(self, db):
        self.db = db

    def create_session(self, user_id, name):
        conn = self.db.get_cur()
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
            self.db.close()

        session = {
            'id': result[0],
            'user_id': result[1],
            'name': result[2],
            'date_created': result[3]
        }
        return session

    def get_session(self, session_id):
        conn = self.db.get_cur()
        cur = conn.cursor()

        cur.execute('SELECT id, user_id, name, time_format(date_created) \
            FROM thoughts.sessions WHERE id = %s', (session_id,))
        result = cur.fetchone()
        self.db.close()

        if result is None:
            return None

        session = {
            'id': result[0],
            'user_id': result[1],
            'name': result[2],
            'date_created': result[3]
        }
        return session

    def get_user_sessions(self, user_id):
        conn = self.db.get_cur()
        cur = conn.cursor()

        cur.execute('SELECT id, user_id, name, time_format(date_created) \
            FROM thoughts.sessions WHERE user_id = %s', (user_id,))
        result = cur.fetchall()
        self.db.close()

        if result is None:
            return None

        session = {
            'id': result[0],
            'user_id': result[1],
            'name': result[2],
            'date_created': result[3]
        }
        return session

    def delete_session(self, session_id):
        conn = self.db.get_cur()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.sessions WHERE id = %s', (session_id,))
        conn.commit()
        self.db.close()

    def get_user_password_hash(self, username):
        conn = self.db.get_cur()
        cur = conn.cursor()

        cur.execute('SELECT id, password, FROM thoughts.users \
            WHERE username = %s', (username,))
        result = cur.fetchone()
        self.db.close()

        if result is None:
            return None

        user = {
            'id': result[0],
            'password': result[1]
        }
        return user
