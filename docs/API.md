# API

## Table of contents

* [Sessions](#sessions)
  * [Login](#login)
* [Users](#users)
  * [User registration](#user-registration)
  * [Get all users](#get-all-users)
  * [Get user](#get-user)
  * [Edit user](#edit-user)
  * [Delete user](#delete-user)
  * [Get user's images](#get-users-images)
  * [Get user's liked images](#get-users-liked-images)
* [Images](#images)
  * [Create an image](#create-an-image)
  * [Get all images](#get-all-images)
  * [Get image](#get-image)
  * [Edit image](#edit-image)
  * [Delete image](#delete-image)
  * [Add image to the current user's likes](#add-image-to-the-current-users-likes)
  * [Get all users liked an image](#get-all-users-liked-an-image)
  * [Remove image from user's likes](#remove-image-from-users-likes)
* [Image assets](#image-assets)
  * [Upload an image](#upload-an-image)
  * [Load image asset](#load-image-asset)

## Sessions

### Create session

loginUser(username, password) {
    const url = '/sessions';
    const body = {username, password};
    return this.request(url, 'POST', body);
  }

### Refresh token

  refreshToken() {
    const url = '/sessions';
    const headers = this.headers();
    headers.set('authorization', session.refreshToken());
    return this.request(url, 'POST', undefined, headers);
  }

  logoutUser() {
    session.reset();
  }

  getSessions() {
    const url = '/sessions';
    return this.request(url);
  }

  deleteSession(sessionId) {
    const url = `/sessions/${sessionId}`;
    return this.request(url, 'DELETE');
  }

## Users

## Posts
