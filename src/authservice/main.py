import os
import time

from authservice import create_server
from authservice.db_client import DbClient
from authservice import logger


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
