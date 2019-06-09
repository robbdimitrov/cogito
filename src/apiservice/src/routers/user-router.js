import { APIRouter } from './api-router';
import { getToken } from './utils';

export class UserRouter extends APIRouter {
  constructor(userClient) {
    super();
    this.userClient = userClient;
  }

  connectRouter(router) {
    // User

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

    // Followers

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
    const identifier = req.body.identifier;
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    this.handleResponse(
      this.userClient.createUser(identifier, email, name, password), res
    );
  }

  getUser(req, res) {
    const username = req.params.username;
    const token = getToken(req);

    this.handleResponse(this.userClient.getUser(username, token), res);
  }

  updateUser(req, res) {
    const identifier = req.body.identifier;
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const bio = req.body.bio;
    const oldPassword = req.body.old_password;
    const token = getToken(req);

    this.handleResponse(
      this.userClient.updateUser(identifier, email,
        name, password, bio, oldPassword, token), res
    );
  }

  deleteUser(req, res) {
    const username = req.params.username;
    const token = getToken(req);

    this.handleResponse(this.userClient.deleteUser(username, token), res);
  }

  // Follows

  getFollowing(req, res) {
    const username = req.params.username;
    const token = getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.userClient.getFollowing(username,
        token, page, limit), res
    );
  }

  getFollowers(req, res) {
    const username = req.params.username;
    const token = getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.userClient.getFollowers(username,
        token, page, limit), res
    );
  }

  follow(req, res) {
    const username = req.params.username;
    const token = getToken(req);

    this.handleResponse(this.userClient.follow(username, token), res);
  }

  unfollow(req, res) {
    const username = req.params.username;
    const token = getToken(req);

    this.handleResponse(this.userClient.unfollow(username, token), res);
  }
}
