class APIClient {
  request(url, method, body, otherHeaders) {
    let options = { method };
    if (body) {
      if (typeof body !== FormData) {
        options.headers = { 'content-type': 'application/json' };
        options.body = JSON.stringify(body);
      } else {
        options.body = body;
      }
    }
    return fetch(url, options)
      .then((response) => response.json());
  }

  // Users

  createUser(name, username, email, password) {
    const url = '/api/users';
    const body = { name, username, email, password };
    return this.request(url, 'POST', body);
  }

  updateUser(userId, name, username, email, bio) {
    const url = `/api/users/${userId}`;
    const body = { name, username, email, bio };
    return this.request(url, 'PUT', body);
  }

  updatePassword(userId, password, oldPassword) {
    const url = `/api/users/${userId}`;
    const body = { password, oldPassword };
    return this.request(url, 'PUT', body);
  }

  getUser(userId) {
    let url = `/api/users/${userId}`;
    return this.request(url, 'GET');
  }

  getFollowing(userId, page, limit = 20) {
    const url = `/api/users/${userId}/following?page=${page}&limit=${limit}`;
    return this.request(url, 'GET');
  }

  getFollowers(userId, page, limit = 20) {
    const url = `/api/users/${userId}/followers?page=${page}&limit=${limit}`;
    return this.request(url, 'GET');
  }

  followUser(userId) {
    const url = `/api/users/${userId}/following`;
    return this.request(url, 'POST');
  }

  unfollowUser(userId) {
    const url = `/api/users/${userId}/following`;
    return this.request(url, 'DELETE');
  }

  // Sessions

  login(email, password) {
    const url = '/api/sessions';
    const body = { email, password };
    return this.request(url, 'POST', body);
  }

  logout(sessionId) {
    const url = `/api/sessions/${sessionId}`;
    return this.request(url, 'DELETE');
  }

  // Posts

  createPost(content) {
    const url = '/api/posts';
    const body = { content };
    return this.request(url, 'POST', body);
  }

  getPost(postId) {
    const url = `/api/posts/${postId}`;
    return this.request(url, 'GET');
  }

  deletePost(postId) {
    const url = `/api/posts/${postId}`;
    return this.request(url, 'DELETE');
  }

  getFeed(page) {
    const url = `/api/posts/feed?page=${page}`;
    return this.request(url, 'GET');
  }

  getPosts(userId, page) {
    const url = `/api/users/${userId}/posts?page=${page}`;
    return this.request(url, 'GET');
  }

  getLikes(userId, page) {
    const url = `/api/users/${userId}/likes?page=${page}`;
    return this.request(url, 'GET');
  }

  likePost(postId) {
    const url = `/api/posts/${postId}/likes`;
    return this.request(url, 'POST');
  }

  unlikePost(postId) {
    const url = `/api/posts/${postId}/likes`;
    return this.request(url, 'DELETE');
  }

  repostPost(postId) {
    const url = `/api/posts/${postId}/reposts`;
    return this.request(url, 'POST');
  }

  removeRepost(postId) {
    const url = `/api/posts/${postId}/reposts`;
    return this.request(url, 'DELETE');
  }

  // Upload

  uploadImage(file) {
    const url = '/api/uploads';
    const formData = new FormData()
    formData.append('image', file);
    return this.request(url, 'POST', formData);
  }
}

export default APIClient;
