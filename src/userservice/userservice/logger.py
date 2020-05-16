import logging


def setup():
    logging.basicConfig(format='%(asctime)s %(message)s')


def print(message):
    logging.error(message)
