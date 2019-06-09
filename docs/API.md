# API

## Table of contents

* [Sessions](#sessions)
  * [Create session](#create-session)
  * [Refresh token](#refresh-token)
  * [Get sessions](#get-sessions)
  * [Delete session](#delete-session)
* [Users](#users)
  * [Create user](#create-user)
  * [Update user](#update-user)
  * [Get user](#get-user)
  * [Get following](#get-following)
  * [Get followers](#get-followers)
  * [Follow user](#follow-user)
  * [Unfollow user](#unfollow-user)
* [Posts](#posts)
  * [Create post](#create-post)
  * [Get post](#get-post)
  * [Delete post](#delete-post)
  * [Like post](#like-post)
  * [Unlike post](#unlike-post)
  * [Retweet post](#retweet-post)
  * [Delete retweet](#delete-retweet)

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
sessionId - id of the session
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

## Users

### Create user

```
POST /users
```

Body parameters:

```
name: string
username: string
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
  "message": "User created."
}
```

### Update user

```
PUT /users/<identifier>
```

URL parameters:

```
identifier - id or username of the user
```

Body parameters:

```
name: string (optional)
username: string (optional)
email: string (optional)
password: string (optional)
old_password: string (optional, required if password is present)
avatar: string (optional)
bio: string (optional)
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "message": "User updated."
}
```

### Get user

```
GET /users/<identifier>
```

URL parameters:

```
identifier - id or username of the user
```

Headers:

```
content-type: application/json
authorization: <access-token>
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
  }
}
```

### Get following

```
GET /users/<identifier>/following
```

URL parameters:

```
identifier - id or username of the user
page - number of page with results
limit - results per request
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "users": [
    {
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
    {
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
    }
  ]
}
```

### Get followers

```
GET /users/<identifier>/followers
```

URL parameters:

```
identifier - id or username of the user
page - number of page with results
limit - results per request
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "users": [
    {
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
    {
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
    }
  ]
}
```

### Follow user

```
POST /users/<identifier>/followers
```

URL parameters:

```
identifier - id or username of the user
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "message": "User followed."
}
```

### Unfollow user

```
DELETE /users/<identifier>/followers
```

URL parameters:

```
identifier - id or username of the user
```

Headers:

```
content-type: application/json
authorization: <access-token>
```

Response:

```json
{
  "message": "User unfollowed."
}
```
