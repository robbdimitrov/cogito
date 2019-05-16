import * as grpc from 'grpc';

import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';
import { APIClient } from './api-client';

export class PostClient extends APIClient {
  constructor(grpcURI) {
    super(grpcURI);

    this.postClient = new services.PostServiceClient(this.grpcURI,
      grpc.credentials.createInsecure());
    this.actionClient = new services.ActionServiceClient(this.grpcURI,
      grpc.credentials.createInsecure());
  }

  // Posts

  createPost(content, token) {
    let request = new messages.PostUpdates();
    request.setContent(content);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.createPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        let post = response.getPost();
        res({
          'id': post.getId(),
          'content': post.getContent(),
          'user_id': post.getUserId(),
          'date_created': post.getDateCreated()
        });
      });
    });
  }

  getPost(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.createPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        let post = response.getPost();
        res({
          'id': post.getId(),
          'content': post.getContent(),
          'user_id': post.getUserId(),
          'date_created': post.getDateCreated()
        });
      });
    });
  }

  getFeed(token, page, limit, countOnly) {
    let request = new messages.DataRequest();
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);
    request.setCountOnly(countOnly);

    return new Promise((res, rej) => {
      this.postClient.getPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let count = response.getCount();
        if (count !== undefined) {
          return rej({
            count
          });
        }
        let posts = [];
        for (let item of response.getPosts()) {
          let post = {
            'id': item.getId(),
            'content': item.getContent(),
            'user_id': item.getUserId(),
            'date_created': item.getDateCreated()
          };
          posts.push(post);
        }
        res(posts);
      });
    });
  }

  getPosts(username, token, page, limit, countOnly) {
    let request = new messages.DataRequest();
    request.setUsername(username);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);
    request.setCountOnly(countOnly);

    return new Promise((res, rej) => {
      this.postClient.getPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let count = response.getCount();
        if (count !== undefined) {
          return rej({
            count
          });
        }
        let posts = [];
        for (let item of response.getPosts()) {
          let post = {
            'id': item.getId(),
            'content': item.getContent(),
            'user_id': item.getUserId(),
            'date_created': item.getDateCreated()
          };
          posts.push(post);
        }
        res(posts);
      });
    });
  }

  getLikedPosts(username, token, page, limit, countOnly) {
    let request = new messages.DataRequest();
    request.setUsername(username);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);
    request.setCountOnly(countOnly);

    return new Promise((res, rej) => {
      this.postClient.getLikedPosts(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let count = response.getCount();
        if (count !== undefined) {
          return rej({
            count
          });
        }
        let posts = [];
        for (let item of response.getPosts()) {
          let post = {
            'id': item.getId(),
            'content': item.getContent(),
            'user_id': item.getUserId(),
            'date_created': item.getDateCreated()
          };
          posts.push(post);
        }
        res(posts);
      });
    });
  }

  deletePost(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.deletePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  // Actions

  likePost(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.likePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  unlikePost(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.unlikePost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  retweetPost(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.retweetPost(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  removeRetweet(postId, token) {
    let request = new messages.PostRequest();
    request.setPostId(postId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.postClient.removeRetweet(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }
}
