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

    def create_user(self, username, email, name, password):
        conn = self.db.getconn()
        cur = conn.cursor()

        cur.execute('SELECT username, email FROM users \
            WHERE username = %s OR email = %s',
            (username, email))
        existing_user = cur.fetchone()

        if existing_user is not None:
            if existing_user[0] == username:
                raise Exception('User with this username already exists.')
            else:
                raise Exception('User with this email already exists.')

        try:
            cur.execute('INSERT INTO users (username, email, name, password) \
                VALUES (%s, %s, %s, %s)',
                (username, email, name, password))
            conn.commit()
        except psycopg2.Error as e:
            print(f'Error creating user: {str(e)}')
            raise DbException('Error while writing to the database.')
        finally:
            cur.close()

    def create_user_query(self, where=''):
        # id name username email avatar bio posts likes
        # following followers followed created
        query = f'SELECT users.id, users.username, users.email, users.name, \
            users.bio, users.avatar, \
            (COUNT(DISTINCT posts.id) + COUNT(DISTINCT retweets.id)) AS posts, \
            COUNT(DISTINCT likes.id) AS likes, \
            COUNT(DISTINCT following.id) AS following, \
            COUNT(DISTINCT followers.id) AS followers, \
            time_format(users.date_created) as date_created \
            FROM users AS users LEFT JOIN followers AS following \
            ON following.follower_id = users.id LEFT JOIN followers AS followers \
            ON followers.user_id = users.id LEFT JOIN posts as posts \
            ON posts.user_id = users.id LEFT JOIN likes as likes \
            ON likes.user_id = users.id  LEFT JOIN retweets as retweets \
            ON retweets.user_id = users.id \
            {where} \
            GROUP BY users.id \
            ORDER BY users.id'
        return query

    def get_user_with_id(self, user_id):
        # get user id and password
        conn = self.db.getconn()
        cur = conn.cursor()

        # const query =
        # 'SELECT id, password FROM users WHERE id = $1';

        cur.execute(self.create_user_query('WHERE users.id = %s'),
            (user_id,))

        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        return map_user(result)

    def get_user(self, user_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        cur.execute(self.create_user_query('WHERE users.id = %s'),
            (user_id,))

        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        return map_user(result)

    def update_user(self, user_id, updates):
        conn = self.db.getconn()
        cur = conn.cursor()

        values = []
        for key, value in updates.items():
            values.append(f"{key} = '{value}'")

        command = f"UPDATE users SET {', '.join(values)} WHERE id = %s"

        try:
            cur.execute(command, (user_id,))
            conn.commit()
        except psycopg2.Error as e:
            print(f'Error updating user: {str(e)}')
            raise DbException('Updating user failed.')
        finally:
            cur.close()

    def get_following(self, user_id, page, limit):
        conn = self.db.getconn()
        cur = conn.cursor()

        cur.execute(self.create_user_query('WHERE users.id IN \
            (SELECT user_id FROM followers \
            WHERE follower_id = %s ORDER BY date_created DESC) \
            OFFSET %s LIMIT %s'),
            (user_id, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        users = rows_to_users(results)
        return users

    def get_followers(self, user_id, page, limit):
        conn = self.db.getconn()
        cur = conn.cursor()

        cur.execute(self.create_user_query('WHERE users.id IN \
            (SELECT follower_id FROM followers \
            WHERE user_id = %s ORDER BY date_created DESC) \
            OFFSET %s LIMIT %s'),
            (user_id, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        users = rows_to_users(results)
        return users

    def follow_user(self, user_id, follower_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        if user_id == follower_id:
            raise UserActionException('You can\'t follow yourself.')

        cur.execute('SELECT EXISTS(SELECT 1 from users \
            WHERE id = %s)', (user_id,))
        exists = cur.fetchone()[0] == 't'

        if not exists:
            raise UserNotFoundException('User not found.')

        try:
            cur.execute('INSERT INTO followers VALUES (%s, %s)',
                (user_id, follower_id))
            conn.commit()
        except Exception:
            raise
        finally:
            cur.close()

    def unfollow_user(self, user_id, follower_id):
        conn = self.db.getconn()
        cur = conn.cursor()

        cur.execute('DELETE FROM followers \
            WHERE user_id = %s AND follower_id = %s',
            (user_id, follower_id))
        conn.commit()
        cur.close()
