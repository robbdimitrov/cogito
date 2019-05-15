import { APIRouter } from './api-router';
import { getToken } from './utils';

export class PostRouter extends APIRouter {
  constructor(postClient) {
    super();
    this.postClient = postClient;
  }

  connectRouter(router) {
    router.post('/', (req, res) => {
      this.createPost(req, res);
    });

    router.get('/:id', (req, res) => {
      this.getPost(req, res);
    });

    router.get('/', (req, res) => {
      this.getPosts(req, res);
    });

    router.delete('/:id', (req, res) => {
      this.deletePost(req, res);
    });

    router.post('/:id/likes', (req, res) => {
      this.likePost(req, res);
    });

    router.get('/users/:userId/likes', (req, res) => {
      this.getLikedPosts(req, res);
    });

    router.delete('/:id/likes/:userId', (req, res) => {
      this.unlikePost(req, res);
    });

    router.post('/:id/retweets', (req, res) => {
      this.likePost(req, res);
    });

    router.delete('/:id/retweets/:userId', (req, res) => {
      this.unlikePost(req, res);
    });
  }

  // Posts

  createPost(req, res) {
    let content = req.body.content;
    let token = getToken(req);

    this.handleResponse(this.postClient.createPost(content, token), res);
  }

  getPost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.getPost(postId, token), res);
  }

  getPosts(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.handleResponse(
      this.postClient.getPosts(username,
        token, page, limit, countOnly), res
    );
  }

  getLikedPosts(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.handleResponse(
      this.postClient.getLikedPosts(username,
        token, page, limit, countOnly), res
    );
  }

  deletePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.deletePost(postId, token), res);
  }

  // Actions

  likePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.likePost(postId, token), res);
  }

  unlikePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.unlikePost(postId, token), res);
  }

  retweetPost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.retweetPost(postId, token), res);
  }

  removeRetweet(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.handleResponse(this.postClient.removeRetweet(postId, token), res);
  }
}
