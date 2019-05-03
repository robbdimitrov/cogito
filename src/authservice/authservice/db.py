import psycopg2


class Database:
    def __init__(self, db_uri):
        self.db_uri = db_uri
        self.cur = None

    def get_cur(self):
        if self.cur is None:
            self.cur = psycopg2.connect(self.db_uri)
        return self.cur

    def close(self):
        if self.cur is not None:
            self.cur.close()
            self.cur = None
