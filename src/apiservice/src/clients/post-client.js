import * as grpc from 'grpc';

import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';
import { APIClient } from './api-client';

export class PostClient extends APIClient {
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }

        const item = response.getPost();
        const post = {
          id: item.getId(),
          content: item.getContent(),
          user_id: item.getUserId(),
          date_created: item.getDateCreated()
        };
        res({post});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }

        const item = response.getPost();
        const post = {
          id: item.getId(),
          content: item.getContent(),
          user_id: item.getUserId(),
          date_created: item.getDateCreated()
        };
        res({post});
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
        const posts = [];
        for (const item of response.getPosts()) {
          const post = {
            id: item.getId(),
            content: item.getContent(),
            user_id: item.getUserId(),
            date_created: item.getDateCreated()
          };
          posts.push(post);
        }
        res({posts});
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
        const posts = [];
        for (const item of response.getPosts()) {
          const post = {
            id: item.getId(),
            content: item.getContent(),
            user_id: item.getUserId(),
            date_created: item.getDateCreated()
          };
          posts.push(post);
        }
        res({posts});
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
        const posts = [];
        for (const item of response.getPosts()) {
          const post = {
            id: item.getId(),
            content: item.getContent(),
            user_id: item.getUserId(),
            date_created: item.getDateCreated()
          };
          posts.push(post);
        }
        res({posts});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({message: response.getMessage()});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({message: response.getMessage()});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({message: response.getMessage()});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({message: response.getMessage()});
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
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({message: response.getMessage()});
      });
    });
  }
}
