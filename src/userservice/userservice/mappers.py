from userservice import thoughts_pb2


def map_user(row):
    return thoughts_pb2.User(
        id=row[0],
        name=row[1],
        username=row[2],
        email=row[3],
        bio=row[4],
        posts=row[5],
        likes=row[6],
        following=row[7],
        followers=row[8],
        followed=row[9],
        created=row[10]
    )
