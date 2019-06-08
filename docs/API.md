# API

## Table of contents

* [Sessions](#sessions)
  * [Create session](#create-session)
  * [Refresh token](#refresh-token)
  * [Get sessions](#get-sessions)
  * [Delete session](#delete-session)

## Sessions

### Create session

```
POST /sessions
```

Body parameters:

```
email: string
password: string
```

Headers:

```
content-type: application/json
```

Response:

```json
{
  "user": {
    "id": "5a0c11682ce7e1000f2a1f5a",
    "username": "superman",
    "email": "clark.kent@dailyplanet.com",
    "name": "Clark Kent",
    "bio": "Kryptonian hero",
    "avatar": "d1d99db3ac32052b9dd66cb5914508dd",
    "posts": 3,
    "likes": 1,
    "following": 0,
    "followers": 10,
    "date_created": "2017-11-15T10:05:28+00:00"
  },
  "token": {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "refresh_token": "eyJ1c2VybmFtZSI6InN1cGVybWFuIiwiaWQi"
  }
}
```

### Refresh token

```
POST /sessions
```

Headers:

```
content-type: application/json
authorization: <refresh-token>
```

Response:

```json
{
  "token": {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "refresh_token": "eyJ1c2VybmFtZSI6InN1cGVybWFuIiwiaWQi"
  }
}
```

### Get sessions

```
GET /sessions
```

Body parameters:

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "sessions": [
    {
      "id": "5a0c11682ce7e1000f2a1f5a",
      "user_id": "5a0c11682cejsdhauqknan1f5a",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0",
      "date_created": "2017-11-15T10:05:28+00:00"
    },
    {
      "id": "5a0c11682ce7e1000f2a1f5a",
      "user_id": "5a0c11682cejsdhauqknan1f5a",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0",
      "date_created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Delete session

```
DELETE /sessions/<sessionId>
```

URL parameters:

```
userId - id of the session
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "message": "Session deleted."
}
```
