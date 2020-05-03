# API

## Table of contents

* [Sessions](#sessions)
  * [Login](#login)
  * [Logout](#logout)
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
  * [Get feed](#get-feed)
  * [Get post](#get-post)
  * [Delete post](#delete-post)
  * [Get posts](#get-posts)
  * [Get likes](#get-likes)
  * [Like post](#like-post)
  * [Unlike post](#unlike-post)
  * [Retweet post](#retweet-post)
  * [Delete retweet](#delete-retweet)
* [Image assets](#image-assets)
  * [Upload image](#upload-image)
  * [Load image asset](#load-image-asset)
* [Errors](#errors)

## Sessions

### Login

Sets an `SID` cookie with the session id.

```
POST /sessions
```

Body parameters:

```
email: string
password: string
```

Response:

```json
{
  "id": 10,
  "name": "Clark Kent",
  "username": "superman",
  "email": "clark.kent@dailyplanet.com",
  "avatar": "d1d99db3ac32052b9dd66cb5914508dd",
  "bio": "Kryptonian hero",
  "posts": 3,
  "likes": 1,
  "following": 0,
  "followers": 10,
  "followed": false,
  "created": "2017-11-15T10:05:28+00:00"
}
```

### Logout

The active session is taken from the `SID` cookie.

```
DELETE /sessions
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

Response:

```json
{
  "id": 10
}
```

### Update user

```
PUT /users/<userId>
```

Path parameters:

```
userId - id of the user
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

### Get user

```
GET /users/<userId>
```

Path parameters:

```
userId - id of the user
```

Response:

```json
{
  "id": 10,
  "name": "Clark Kent",
  "username": "superman",
  "email": "clark.kent@dailyplanet.com",
  "avatar": "d1d99db3ac32052b9dd66cb5914508dd",
  "bio": "Kryptonian hero",
  "posts": 3,
  "likes": 1,
  "following": 0,
  "followers": 10,
  "followed": false,
  "created": "2017-11-15T10:05:28+00:00"
}
```

### Get following

```
GET /users/<userId>/following
```

Path parameters:

```
userId - id of the user
page - number of page with results
limit - results per request
```

Response:

```json
{
  "items": [
    {
      "id": 10,
      "name": "Clark Kent",
      "username": "superman",
      "email": "clark.kent@dailyplanet.com",
      "avatar": "d1d99db3ac32052b9dd66cb5914508dd",
      "bio": "Kryptonian hero",
      "posts": 3,
      "likes": 1,
      "following": 0,
      "followers": 10,
      "followed": false,
      "created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Get followers

```
GET /users/<userId>/followers
```

Path parameters:

```
userId - id of the user
page - number of page with results
limit - results per request
```

Response:

```json
{
  "items": [
    {
      "id": 10,
      "name": "Clark Kent",
      "username": "superman",
      "email": "clark.kent@dailyplanet.com",
      "avatar": "d1d99db3ac32052b9dd66cb5914508dd",
      "bio": "Kryptonian hero",
      "posts": 3,
      "likes": 1,
      "following": 0,
      "followers": 10,
      "followed": false,
      "created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Follow user

```
POST /users/<userId>/followers
```

Path parameters:

```
userId - id of the user
```

### Unfollow user

```
DELETE /users/<userId>/followers
```

Path parameters:

```
userId - id of the user
```

## Posts

### Create post

```
POST /posts
```

Body parameters:

```
content: string
```

Response:

```json
{
  "id": 12
}
```

### Get feed

```
GET /posts
```

Path parameters:

```
page - number of page with results
limit - results per request
```

Response:

```json
{
  "items": [
    {
      "id": 12,
      "userId": 10,
      "content": "Some post content",
      "likes": 10,
      "liked": true,
      "retweets": 2,
      "retweeted": false,
      "created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Get post

```
GET /posts/<postId>
```

Path parameters:

```
postId - id of the post
```

Response:

```json
{
  "id": 12,
  "userId": 10,
  "content": "Some post content",
  "likes": 10,
  "liked": true,
  "retweets": 2,
  "retweeted": false,
  "created": "2017-11-15T10:05:28+00:00"
}
```

### Delete post

```
DELETE /posts/<postId>
```

Path parameters:

```
postId - id of the post
```

### Get posts

```
GET /users/<userId>/posts
```

Path parameters:

```
userId - id of the user
page - number of page with results
limit - results per request
```

Response:

```json
{
  "items": [
    {
      "id": 12,
      "userId": 10,
      "content": "Some post content",
      "likes": 10,
      "liked": true,
      "retweets": 2,
      "retweeted": false,
      "created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Get likes

```
GET /users/<userId>/likes
```

Path parameters:

```
userId - id of the user
page - number of page with results
limit - results per request
```

Response:

```json
{
  "items": [
    {
      "id": 12,
      "userId": 10,
      "content": "Some post content",
      "likes": 10,
      "liked": true,
      "retweets": 2,
      "retweeted": false,
      "created": "2017-11-15T10:05:28+00:00"
    }
  ]
}
```

### Like post

```
POST /posts/<postId>/likes
```

Path parameters:

```
postId - id of the post
```

### Unlike post

```
DELETE /posts/<postId>/likes
```

Path parameters:

```
postId - id of the post
```

### Retweet post

```
POST /posts/<postId>/retweets
```

Path parameters:

```
postId - id of the post
```

### Delete retweet

```
DELETE /posts/<postId>/retweets
```

Path parameters:

```
postId - id of the post
```

## Image assets

### Upload image

File size should be less than 1MB.

```
POST /uploads
```

Body parameters:

```
image: file sent as multipart/form-data
```

Response:

```json
{
  "filename": "d4aab3fd72517522479c08520bc150a3"
}
```

### Load image asset

```
GET /uploads/<filename>
```

Path parameters:

```
filename - filename returned from the upload function
```

Response:

```
The image data
```

## Errors

Errors contain the message describing the error.

```json
{
  "message": "Incorrect email or password."
}
```
