from userservice import thoughts_pb2


def map_user(row):
    return thoughts_pb2.User(
        id=row[0],
        name=row[1],
        username=row[2],
        email=row[3],
        avatar=row[4],
        bio=row[5],
        posts=row[6],
        likes=row[7],
        following=row[8],
        followers=row[9],
        followed=row[10],
        created=row[11]
    )
