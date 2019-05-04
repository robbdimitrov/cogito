import psycopg2


class Database:
    def __init__(self, db_uri):
        self.db_uri = db_uri
        self.conn = None

    def get_conn(self):
        if self.conn is None:
            self.conn = psycopg2.connect(self.db_uri)
        return self.conn

    def close(self):
        if self.conn is not None:
            self.conn.close()
            self.conn = None
