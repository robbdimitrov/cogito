import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';

export class PostClient {
  constructor(postURI) {
    this.postURI = postURI;

    this.postClient = new services.PostServiceClient(this.postURI,
      grpc.credentials.createInsecure());
    this.actionClient = new services.ActionServiceClient(this.postURI,
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
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
        for (item in response.getPosts()) {
          post = {
            'id': post.getId(),
            'content': post.getContent(),
            'user_id': post.getUserId(),
            'date_created': post.getDateCreated()
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
        for (item in response.getPosts()) {
          post = {
            'id': post.getId(),
            'content': post.getContent(),
            'user_id': post.getUserId(),
            'date_created': post.getDateCreated()
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
      });
    });
  }
}
