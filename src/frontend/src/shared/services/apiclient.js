import {httpMethod} from '../constants';
import Session from './session';

class APIClient {
  request(url, method, body) {
    let options = {
      method,
      credentials: 'include',
    };
    if (body) {
      options.headers = {'content-type': 'application/json'};
      options.body = JSON.stringify(body);
    }
    return fetch(url, options)
      .then((response) => {
        if (response.status === 401) {
          Session.reset();
          window.location.reload();
          return Promise.reject(new Error('Unauthorized'));
        }
        if (response.status === 204) {
          return Promise.resolve();
        }
        if (!response.ok) {
          return response.json().then((data) => Promise.reject(new Error(data.message || 'Request failed')));
        }
        return response.json();
      });
  }

  // Users

  createUser(name, username, email, password) {
    const url = '/api/users';
    const body = {name, username, email, password};
    return this.request(url, httpMethod.post, body);
  }

  updateUser(userId, name, username, email, bio) {
    const url = `/api/users/${userId}`;
    const body = {name, username, email, bio};
    return this.request(url, httpMethod.put, body);
  }

  updatePassword(userId, password, oldPassword) {
    const url = `/api/users/${userId}`;
    const body = {password, oldPassword};
    return this.request(url, httpMethod.put, body);
  }

  getUser(userId) {
    let url = `/api/users/${userId}`;
    return this.request(url, httpMethod.get);
  }

  getUserByUsername(username) {
    let url = `/api/users?username=${username}`;
    return this.request(url, httpMethod.get);
  }

  getFollowing(userId, page, limit = 20) {
    const url = `/api/users/${userId}/following?page=${page}&limit=${limit}`;
    return this.request(url, httpMethod.get);
  }

  getFollowers(userId, page, limit = 20) {
    const url = `/api/users/${userId}/followers?page=${page}&limit=${limit}`;
    return this.request(url, httpMethod.get);
  }

  followUser(userId) {
    const url = `/api/users/${userId}/following`;
    return this.request(url, httpMethod.post);
  }

  unfollowUser(userId) {
    const url = `/api/users/${userId}/following`;
    return this.request(url, httpMethod.delete);
  }

  // Sessions

  login(email, password) {
    const url = '/api/sessions';
    const body = {email, password};
    return this.request(url, httpMethod.post, body);
  }

  logout() {
    const url = '/api/sessions';
    return this.request(url, httpMethod.delete);
  }

  getSessions() {
    const url = '/api/sessions';
    return this.request(url, httpMethod.get);
  }

  deleteSession(sessionId) {
    const url = `/api/sessions/${sessionId}`;
    return this.request(url, httpMethod.delete);
  }

  // Posts

  createPost(content) {
    const url = '/api/posts';
    const body = {content};
    return this.request(url, httpMethod.post, body);
  }

  getPost(postId) {
    const url = `/api/posts/${postId}`;
    return this.request(url, httpMethod.get);
  }

  deletePost(postId) {
    const url = `/api/posts/${postId}`;
    return this.request(url, httpMethod.delete);
  }

  getFeed(page) {
    const url = `/api/posts/feed?page=${page}`;
    return this.request(url, httpMethod.get);
  }

  getPosts(userId, page) {
    const url = `/api/users/${userId}/posts?page=${page}`;
    return this.request(url, httpMethod.get);
  }

  getLikes(userId, page) {
    const url = `/api/users/${userId}/likes?page=${page}`;
    return this.request(url, httpMethod.get);
  }

  likePost(postId) {
    const url = `/api/posts/${postId}/likes`;
    return this.request(url, httpMethod.post);
  }

  unlikePost(postId) {
    const url = `/api/posts/${postId}/likes`;
    return this.request(url, httpMethod.delete);
  }

  repostPost(postId) {
    const url = `/api/posts/${postId}/reposts`;
    return this.request(url, httpMethod.post);
  }

  removeRepost(postId) {
    const url = `/api/posts/${postId}/reposts`;
    return this.request(url, httpMethod.delete);
  }
}

export default APIClient;
