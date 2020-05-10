from authservice import thoughts_pb2


def map_session(row):
    return thoughts_pb2.Session(
        id=row[0],
        user_id=row[1],
        date_created=row[2]
    )
