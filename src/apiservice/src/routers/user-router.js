import { Router } from 'express';

import { getToken } from './utils';

export class UserRoter {
  constructor(userClient) {
    this.userClient = userClient;
    this.router = new Router();
    this.connectRouter(this.router);
  }

  connectRouter(router) {
    router.post('/', (req, res) => {
      this.createUser(req, res);
    });

    router.get('/:id', (req, res) => {
      this.getUser(req, res);
    });

    router.put('/:id', (req, res) => {
      this.updateUser(req, res);
    });

    router.delete('/:id', (req, res) => {
      this.deleteUser(req, res);
    });

    router.get('/:id/following/', (req, res) => {
      this.getFollowing(req, res);
    });

    router.get('/:id/followers/', (req, res) => {
      this.getFollowers(req, res);
    });

    router.post('/:id/followers/', (req, res) => {
      this.follow(req, res);
    });

    router.delete('/:id/followers/:followerId', (req, res) => {
      this.unfollow(req, res);
    });
  }

  // Users

  createUser(req, res) {
    let username = req.body.username;
    let email = req.body.email;
    let name = req.body.name;
    let password = req.body.password;

    this.userClient.createUser(username, email, name, password)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  getUser(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.userClient.getUser(username, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  updateUser(req, res) {
    let username = req.body.username;
    let email = req.body.email;
    let name = req.body.name;
    let password = req.body.password;
    let bio = req.body.bio;
    let oldPassword = req.body.oldPassword;
    let token = getToken(req);

    this.userClient.updateUser(username, email,
      name, password, bio, oldPassword, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  deleteUser(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.userClient.deleteUser(username, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }


  // Follows

  getFollowing(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.userClient.getFollowing(username, token, page, limit, countOnly)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  getFollowers(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.userClient.getFollowers(username, token, page, limit, countOnly)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  follow(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.userClient.follow(username, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  unfollow(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.userClient.unfollow(username, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }
}
