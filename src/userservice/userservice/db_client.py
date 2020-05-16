import sys

from psycopg2 import pool, DatabaseError

from userservice.mappers import map_user
from userservice import logger


class DbClient:
    def __init__(self, db_url):
        try:
            self.db = pool.ThreadedConnectionPool(1, 10, db_url)
        except DatabaseError as e:
            logger.print(f'Unable to connect to database: {e}')
            sys.exit(1)

    def close(self):
        self.db.closeall()

    def create_user(self, name, username, email, password):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'INSERT INTO users (name, username, email, password)\
                VALUES (%s, %s, %s, %s) RETURNING id'
            cur.execute(query, (name, username, email, password))
            result = cur.fetchone()
            conn.commit()
            return result[0]
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def get_user_with_id(self, user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, password FROM users WHERE id = %s'
            cur.execute(query, (user_id,))
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

    def get_user(self, user_id, current_user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, name, username, email, avatar, bio,\
                (SELECT count(*) FROM posts WHERE user_id = id) AS posts,\
                (SELECT count(*) FROM likes WHERE user_id = id) AS likes,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS following,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS followers,\
                EXISTS (SELECT 1 FROM followers\
                WHERE user_id = id AND follower_id = %s) AS followed,\
                time_format(created) AS created\
                FROM users WHERE id = %s'
            cur.execute(query, (current_user_id, user_id))
            result = cur.fetchone()
            if result is None:
                return None
            return map_user(result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def update_user(self, user_id, name, username, email, avatar, bio):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = f'UPDATE users SET name = %s, username = %s, email = %s\
                email = %s, avatar = %s, bio = %s WHERE id = %s'
            cur.execute(query, (name, username, email, avatar, bio, user_id))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def update_password(self, user_id, password):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = f'UPDATE users SET password = %s WHERE id = %s'
            cur.execute(query, (password, user_id))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def get_following(self, user_id, page, limit, current_user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, name, username, email, avatar, bio,\
                (SELECT count(*) FROM posts WHERE user_id = id) AS posts,\
                (SELECT count(*) FROM likes WHERE user_id = id) AS likes,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS following,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS followers,\
                EXISTS (SELECT 1 FROM followers\
                WHERE user_id = id AND follower_id = %s) AS followed,\
                time_format(created) AS created\
                FROM users WHERE id = %s\
                INNER JOIN followers ON user_id = id\
                WHERE follower_id = $2\
                ORDER BY followers.created DESC\
                LIMIT %s OFFSET %s'
            cur.execute(query, (current_user_id, user_id, limit, page * limit))
            result = cur.fetchall()
            return map(lambda user: map_user(user), result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def get_followers(self, user_id, page, limit, current_user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'SELECT id, name, username, email, avatar, bio,\
                (SELECT count(*) FROM posts WHERE user_id = id) AS posts,\
                (SELECT count(*) FROM likes WHERE user_id = id) AS likes,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS following,\
                (SELECT count(*) FROM followers WHERE user_id = id) AS followers,\
                EXISTS (SELECT 1 FROM followers\
                WHERE user_id = id AND follower_id = %s) AS followed,\
                time_format(created) AS created\
                FROM users WHERE id = %s\
                INNER JOIN followers ON follower_id = id\
                WHERE user_id = $2\
                ORDER BY followers.created DESC\
                LIMIT %s OFFSET %s'
            cur.execute(query, (current_user_id, user_id, limit, page * limit))
            result = cur.fetchall()
            return map(lambda user: map_user(user), result)
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def follow_user(self, user_id, follower_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'INSERT INTO followers (user_id, follower_id)\
                VALUES (%s, %s)'
            cur.execute(query, (user_id, follower_id))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)

    def unfollow_user(self, user_id, follower_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        try:
            query = 'DELETE FROM followers\
                WHERE user_id = %s AND follower_id = %s'
            cur.execute(query, (user_id, follower_id))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()
            self.db.putconn(conn)
