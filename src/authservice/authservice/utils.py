import re

from authservice import thoughts_pb2


def validate_email(email):
    return re.match(r'[^@]+@[^@]+\.[^@]+', email) is not None


def row_to_session(row):
    session = thoughts_pb2.Session(
        id=row[0],
        user_id=row[1],
        user_agent=row[2],
        date_created=row[3])
    return session


def rows_to_sessions(rows):
    sessions = []
    for row in rows:
        session = row_to_session(row)
        sessions.append(session)
    return sessions
