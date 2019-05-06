import psycopg2
import logging

from userservice import db
from userservice.exceptions import (
    DBException,
    ExistingUserException,
    UserActionException,
    WrongUsernameException
)
from userservice.utils import db_object_to_dict


class DBClient:
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
                VALUES(%s, %s, %s, %s) \
                RETURNING id, username, email, name, bio, time_format(date_created)',
                (username, email, name, password))
            result = cur.fetchone()
            conn.commit()
        except psycopg2.Error as e:
            logging.error(f'Error creating user: {str(e)}')
            raise DBException('Error while writing to the database.')
        finally:
            cur.close()

        if result is None:
            return None

        user = db_object_to_dict(result)
        return user

    def get_user(self, username, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        if user_id is not None:
            cur.execute('SELECT id, username, email, name, bio, \
                time_format(date_created) FROM thoughts.users \
                WHERE user_id = %s',
                (user_id,))
        else:
            cur.execute('SELECT id, username, email, name, bio, \
                time_format(date_created) FROM thoughts.users \
                WHERE username = %s',
                (username,))
        result = cur.fetchone()
        cur.close()

        if result is None:
            return None

        user = db_object_to_dict(result)
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
            raise DBException('Updating user failed.')
        finally:
            cur.close()

    def delete_user(self, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.users WHERE id = %s', (user_id,))
        conn.commit()
        cur.close()

    def get_followers(self, username, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, username, email, name, bio, \
            time_format(date_created) \
            FROM thoughts.users, thoughts.followings \
            WHERE user_id = (SELECT id FROM thoughts.users WHERE username = %s) \
            AND follower_id = id \
            ORDER BY date_created DESC \
            OFFSET %s, LIMIT %s',
            (username, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        if results is None:
            return None

        users = [db_object_to_dict(result) for result in results]
        return users

    def get_following(self, username, page, limit):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id, username, email, name, bio, \
            time_format(date_created) \
            FROM thoughts.users, thoughts.followings \
            WHERE follower_id = (SELECT id FROM thoughts.users WHERE username = %s) \
            AND user_id = id \
            ORDER BY date_created DESC \
            OFFSET %s, LIMIT %s',
            (username, page * limit, limit))
        results = cur.fetchall()
        cur.close()

        if results is None:
            return None

        users = [db_object_to_dict(result) for result in results]
        return users

    def follow_user(self, username, follower_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('SELECT id FROM thoughts.users WHERE username = %s',
            (username,))
        user = cur.fetchone()

        if user is None:
            raise WrongUsernameException('Wrong username.')

        if user['id'] == follower_id:
            raise UserActionException('You can\'t follow yourself.')

        try:
            cur.execute('INSERT INTO thoughts.followings VALUES(%s, %s)',
                (user['id'], follower_id))
            conn.commit()
        except psycopg2.Error as e:
            logging.error(f'Error following user: {str(e)}')
            raise DBException('Error following user.')
        finally:
            cur.close()

    def unfollow_user(self, username, user_id):
        conn = self.db.get_conn()
        cur = conn.cursor()

        cur.execute('DELETE FROM thoughts.followings \
            WHERE user_id = (SELECT id FROM thoughts.users WHERE username = %s) \
            AND follower_id = %s',
            (username, user_id))
        conn.commit()
        cur.close()
