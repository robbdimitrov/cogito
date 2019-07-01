import psycopg2

from userservice import db, thoughts_pb2
from userservice.exceptions import (
    DbException,
    ExistingUserException,
    UserActionException,
    UserNotFoundException
)
from userservice.utils import (
    row_to_user,
    rows_to_users,
    rows_to_ids
)


class DbClient:
    def __init__(self, db):
        self.db = db

    def create_user(self, username, email, name, password):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT username, email FROM thoughts.users \
            WHERE username = %s OR email = %s',
            (username, email))
        existing_user = cur.fetchone()

        if existing_user is not None:
            if existing_user[0] == username:
                raise ExistingUserException('User with this username already exists.')
            else:
                raise ExistingUserException('User with this email already exists.')

        try:
            cur.execute('INSERT INTO thoughts.users (username, email, name, password) \
                VALUES(%s, %s, %s, %s)',
                (username, email, name, password))
            conn.commit()
        except psycopg2.Error as e:
            print(f'Error creating user: {str(e)}')
            raise DbException('Error while writing to the database.')
        finally:
            cur.close()

    def create_user_query(self, where=''):
        query = f'SELECT users.id, users.username, users.email, users.name, \
            users.bio, users.avatar, \
            (COUNT(DISTINCT posts.id) + COUNT(DISTINCT retweets.id)) AS posts, \
            COUNT(DISTINCT likes.id) AS likes, \
            COUNT(DISTINCT following.id) AS following, \
            COUNT(DISTINCT followers.id) AS followers, \
            time_format(users.date_created) as date_created \
            FROM thoughts.users AS users LEFT JOIN thoughts.followings AS following \
            ON following.follower_id = users.id LEFT JOIN thoughts.followings AS followers \
            ON followers.user_id = users.id LEFT JOIN thoughts.posts as posts \
            ON posts.user_id = users.id LEFT JOIN thoughts.likes as likes \
            ON likes.user_id = users.id  LEFT JOIN thoughts.retweets as retweets \
            ON retweets.user_id = users.id \
            {where} \
            GROUP BY users.id \
            ORDER BY users.id'
        return query

    def get_user(self, user_id, username=None):
        conn = self.db.get_conn()
        cur = conn.cursor()

        if username:
            cur.execute(self.create_user_query('WHERE users.username = %s'),
                (username,))
        else:
            cur.execute(self.create_user_query('WHERE users.id = %s'),
                (user_id,))
        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        user = row_to_user(result)
        return user

    def update_user(self, user_id, updates):
        conn = self.db.get_conn()
        cur = conn.cursor()

        values = []
        for key, value in updates.items():
            values.append(f"{key} = '{value}'")

        command = f"UPDATE thoughts.users SET {', '.join(values)} WHERE id = %s"

        try:
            cur.execute(command, (user_id,))
            conn.commit()
        except psycopg2.Error as e:
            print(f'Error updating user: {str(e)}')
            raise DbException('Updating user failed.')
        finally:
            cur.close()

    def delete_user(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.users WHERE id = %s', (user_id,))
        conn.commit()
        cur.close()

    def get_following(self, user_id, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute(self.create_user_query('WHERE users.id IN \
            (SELECT user_id FROM thoughts.followings \
            WHERE follower_id = %s ORDER BY date_created DESC) \
            OFFSET %s LIMIT %s'),
            (user_id, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        users = rows_to_users(results)
        return users

    def get_following_ids(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id FROM thoughts.followings \
            WHERE follower_id = %s',
            (user_id,))
        results = cur.fetchall()
        cur.close()

        users = rows_to_ids(results)
        return users

    def get_followers(self, user_id, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute(self.create_user_query('WHERE users.id IN \
            (SELECT follower_id FROM thoughts.followings \
            WHERE user_id = %s ORDER BY date_created DESC) \
            OFFSET %s LIMIT %s'),
            (user_id, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        users = rows_to_users(results)
        return users

    def get_followers_ids(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT follower_id FROM thoughts.followings \
            WHERE user_id = %s',
            (user_id,))
        results = cur.fetchall()
        cur.close()

        users = rows_to_ids(results)
        return users

    def follow_user(self, user_id, follower_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        if user_id == follower_id:
            raise UserActionException('You can\'t follow yourself.')

        cur.execute('SELECT EXISTS(SELECT 1 from thoughts.users \
            WHERE id = %s)', (user_id,))
        exists = cur.fetchone()[0] == 't'

        if not exists:
            raise UserNotFoundException('User not found.')

        try:
            cur.execute('INSERT INTO thoughts.followings VALUES(%s, %s)',
                (user_id, follower_id))
            conn.commit()
        except psycopg2.Error as e:
            print(f'Error following user: {str(e)}')
            raise DbException('Error following user.')
        finally:
            cur.close()

    def unfollow_user(self, user_id, follower_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.followings \
            WHERE user_id = %s AND follower_id = %s',
            (user_id, follower_id))
        conn.commit()
        cur.close()
