import psycopg2


class Database:
    def __init__(self, db_url):
        self.db_url = db_url
        self.conn = None

    def get_conn(self):
        if self.conn is None:
            self.conn = psycopg2.connect(self.db_url)
        return self.conn

    def close(self):
        if self.conn is not None:
            self.conn.close()
            self.conn = None
