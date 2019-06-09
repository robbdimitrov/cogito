import psycopg2
import logging

from userservice import db, thoughts_pb2
from userservice.exceptions import (
    DbException,
    ExistingUserException,
    UserActionException,
    UserNotFoundException
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
            logging.error(f'Error creating user: {str(e)}')
            raise DbException('Error while writing to the database.')
        finally:
            cur.close()

    def get_user(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, username, email, name, bio, avatar, \
            time_format(date_created) FROM thoughts.users \
            WHERE id = %(id)s OR username = %(id)s',
            {'id': user_id})
        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        user = thoughts_pb2.User(
            id=result[0],
            username=result[1],
            email=result[2],
            name=result[3],
            bio=result[4],
            avatar=result[5],
            date_created=result[6])
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
            logging.error(f'Error updating user: {str(e)}')
            raise DbException('Updating user failed.')
        finally:
            cur.close()

    def delete_user(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.users WHERE id = %s', (user_id,))
        conn.commit()
        cur.close()

    def get_followers(self, user_id, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, username, email, name, bio, avatar, \
            time_format(date_created) \
            FROM thoughts.users, thoughts.followings \
            WHERE user_id = (SELECT id FROM thoughts.users \
            WHERE username = %(id)s OR id = %(id)s)) \
            AND follower_id = id \
            ORDER BY date_created DESC \
            OFFSET %(offset)s LIMIT %(limit)s',
            {'id': user_id, 'offset': page * limit, 'limit': limit})
        results = cur.fetchall()
        cur.close()

        if results is None:
            return None

        users = []
        for result in results:
            user = thoughts_pb2.User(
                id=result[0],
                username=result[1],
                email=result[2],
                name=result[3],
                bio=result[4],
                avatar=result[5],
                date_created=result[6])
            users.append(user)
        return users

    def get_following(self, user_id, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, username, email, name, bio, avatar, \
            time_format(date_created) \
            FROM thoughts.users, thoughts.followings \
            WHERE follower_id = (SELECT id FROM thoughts.users WHERE \
            username = %(id)s OR id = %(id)s) \
            AND user_id = id \
            ORDER BY date_created DESC \
            OFFSET %(offset)s LIMIT %(limit)s',
            {'id': user_id, 'offset': page * limit, 'limit': limit})
        results = cur.fetchall()
        cur.close()

        if results is None:
            return None

        users = []
        for result in results:
            user = thoughts_pb2.User(
                id=result[0],
                username=result[1],
                email=result[2],
                name=result[3],
                bio=result[4],
                avatar=result[5],
                date_created=result[6])
            users.append(user)
        return users

    def follow_user(self, user_id, follower_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id FROM thoughts.users \
            WHERE username = %(id)s or id = %(id)s',
            {'id': user_id})
        user = cur.fetchone()

        if user is None:
            raise UserNotFoundException('User not found.')

        if user[0] == follower_id:
            raise UserActionException('You can\'t follow yourself.')

        try:
            cur.execute('INSERT INTO thoughts.followings VALUES(%s, %s)',
                (user[0], follower_id))
            conn.commit()
        except psycopg2.Error as e:
            logging.error(f'Error following user: {str(e)}')
            raise DbException('Error following user.')
        finally:
            cur.close()

    def unfollow_user(self, user_id, current_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.followings \
            WHERE user_id = (SELECT id FROM thoughts.users \
            WHERE username = %(id)s OR id = %(id)s) \
            AND follower_id = %(current)s',
            {'id': user_id, 'current': current_id})
        conn.commit()
        cur.close()
