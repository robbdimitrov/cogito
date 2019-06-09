import { APIRouter } from './api-router';
import { getToken } from './utils';

export class PostRouter extends APIRouter {
  constructor(postClient) {
    super();
    this.postClient = postClient;
  }

  connectRouter(router) {
    // Post

    router.post('/', (req, res) => {
      this.createPost(req, res);
    });

    router.get('/:id', (req, res) => {
      this.getPost(req, res);
    });

    router.delete('/:id', (req, res) => {
      this.deletePost(req, res);
    });

    // Posts

    router.get('/feed', (req, res) => {
      this.getFeed(req, res);
    });

    router.get('/users/:username', (req, res) => {
      this.getPosts(req, res);
    });

    router.get('/users/:username/likes', (req, res) => {
      this.getLikedPosts(req, res);
    });

    // Actions

    router.post('/:id/likes', (req, res) => {
      this.likePost(req, res);
    });

    router.delete('/:id/likes', (req, res) => {
      this.unlikePost(req, res);
    });

    router.post('/:id/retweets', (req, res) => {
      this.likePost(req, res);
    });

    router.delete('/:id/retweets', (req, res) => {
      this.removeRetweet(req, res);
    });
  }

  // Posts

  createPost(req, res) {
    const content = req.body.content;
    const token = getToken(req);

    this.handleResponse(this.postClient.createPost(content, token), res);
  }

  getPost(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.getPost(postId, token), res);
  }

  getFeed(req, res) {
    const token = getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.postClient.getFeed(token, page, limit), res
    );
  }

  getPosts(req, res) {
    const username = req.params.username;
    const token = getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.postClient.getPosts(username,
        token, page, limit), res
    );
  }

  getLikedPosts(req, res) {
    const username = req.params.username;
    const token = getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.postClient.getLikedPosts(username,
        token, page, limit), res
    );
  }

  deletePost(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.deletePost(postId, token), res);
  }

  // Actions

  likePost(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.likePost(postId, token), res);
  }

  unlikePost(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.unlikePost(postId, token), res);
  }

  retweetPost(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.retweetPost(postId, token), res);
  }

  removeRetweet(req, res) {
    const postId = req.params.id;
    const token = getToken(req);

    this.handleResponse(this.postClient.removeRetweet(postId, token), res);
  }
}
