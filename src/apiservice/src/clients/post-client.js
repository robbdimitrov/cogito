const grpc = require('grpc');

const services = require('../genproto/thoughts_grpc_pb');
const messages = require('../genproto/thoughts_pb');
const APIClient = require('./api-client');
const itemToPost = require('../utils').itemToPost;
const itemsToPosts = require('../utils').itemsToPosts;

class PostClient extends APIClient {
  constructor(serviceURI) {
    super(serviceURI);

    this.postClient = new services.PostServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
    this.actionClient = new services.ActionServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
  }

  // Posts

  createPost(content, token) {
    const request = new messages.PostUpdates();
    request.setContent(content);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.createPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        const post = itemToPost(response.getPost());
        res({ post });
      });
    });
  }

  getPost(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.createPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        const post = itemToPost(response.getPost());
        res({ post });
      });
    });
  }

  getFeed(token, page, limit) {
    const request = new messages.DataRequest();
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);

    return new Promise((res, rej) => {
      this.postClient.getPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const posts = itemsToPosts(response.getPosts());
        res({ posts });
      });
    });
  }

  getPosts(userId, token, page, limit) {
    const request = new messages.DataRequest();
    request.setUserId(userId);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);

    return new Promise((res, rej) => {
      this.postClient.getPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const posts = itemsToPosts(response.getPosts());
        res({ posts });
      });
    });
  }

  getLikedPosts(userId, token, page, limit) {
    const request = new messages.DataRequest();
    request.setUserId(userId);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);

    return new Promise((res, rej) => {
      this.postClient.getLikedPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const posts = itemsToPosts(response.getPosts());
        res({ posts });
      });
    });
  }

  deletePost(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.deletePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  // Actions

  likePost(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.likePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  unlikePost(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.unlikePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  retweetPost(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.retweetPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  removeRetweet(postId, token) {
    const request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.removeRetweet(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }
}

module.exports = PostClient;
