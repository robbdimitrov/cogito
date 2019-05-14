import { Router } from 'express';

import { getToken } from './utils';

export class PostRouter {
  constructor(postClient) {
    this.postClient = postClient;
    this.router = new Router();
    this.connectRouter(this.router);
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

    this.postClient.createPost(content, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  getPost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.getPost(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  getPosts(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.postClient.getPosts(username, token, page, limit, countOnly)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  getLikedPosts(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.postClient.getLikedPosts(username, token, page, limit, countOnly)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  deletePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.deletePost(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  // Actions

  likePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.likePost(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  unlikePost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.unlikePost(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  retweetPost(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.retweetPost(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  removeRetweet(req, res) {
    let postId = req.params.id;
    let token = getToken(req);

    this.postClient.removeRetweet(postId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }
}
