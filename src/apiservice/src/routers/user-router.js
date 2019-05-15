import { APIRouter } from './api-router';
import { getToken } from './utils';

export class UserRouter extends APIRouter {
  constructor(userClient) {
    super();
    this.userClient = userClient;
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

    this.handleResponse(
      this.userClient.createUser(username, email, name, password), res
    );
  }

  getUser(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.handleResponse(this.userClient.getUser(username, token), res);
  }

  updateUser(req, res) {
    let username = req.body.username;
    let email = req.body.email;
    let name = req.body.name;
    let password = req.body.password;
    let bio = req.body.bio;
    let oldPassword = req.body.oldPassword;
    let token = getToken(req);

    this.handleResponse(
      this.userClient.updateUser(username, email,
        name, password, bio, oldPassword, token), res
    );
  }

  deleteUser(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.handleResponse(this.userClient.deleteUser(username, token), res);
  }


  // Follows

  getFollowing(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.handleResponse(
      this.userClient.getFollowing(username,
        token, page, limit, countOnly), res
    );
  }

  getFollowers(req, res) {
    let username = req.params.username;
    let token = getToken(req);
    let page = parseInt(req.query.page) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let countOnly = (parseInt(req.query.count) || 0) === 1;

    this.handleResponse(
      this.userClient.getFollowers(username,
        token, page, limit, countOnly), res
    );
  }

  follow(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.handleResponse(this.userClient.follow(username, token), res);
  }

  unfollow(req, res) {
    let username = req.params.username;
    let token = getToken(req);

    this.handleResponse(this.userClient.unfollow(username, token), res);
  }
}
