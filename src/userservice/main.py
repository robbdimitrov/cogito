import os
import time

from userservice import create_server
from userservice.db_client import DbClient
from userservice import logger


port = os.getenv('PORT') or '5050'
db_url = os.getenv('DATABASE_URL')

dbClient = DbClient(db_url)
server = create_server(port, dbClient)


if __name__ == '__main__':
    logger.setup()

    logger.print(f'Server is starting on port {port}')
    server.start()

    try:
     while True:
         time.sleep(36000)
    except KeyboardInterrupt:
        logger.print('Server is shutting down...')
        server.stop(0)
        dbClient.close()
