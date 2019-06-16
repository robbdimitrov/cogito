import { APIRouter } from './api-router';

export class UserRouter extends APIRouter {
  constructor(userClient, postClient) {
    super();
    this.userClient = userClient;
    this.postClient = postClient;
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

    router.get('/:id/following', (req, res) => {
      this.getFollowing(req, res);
    });

    router.get('/:id/followers', (req, res) => {
      this.getFollowers(req, res);
    });

    router.post('/:id/followers', (req, res) => {
      this.follow(req, res);
    });

    router.delete('/:id/followers/:followerId', (req, res) => {
      this.unfollow(req, res);
    });

    // Posts

    router.get('/:id/posts', (req, res) => {
      this.getPosts(req, res);
    });

    router.get('/:id/likes', (req, res) => {
      this.getLikedPosts(req, res);
    });
  }

  // Users

  createUser(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    this.handleResponse(
      this.userClient.createUser(username, email, name, password), res
    );
  }

  getUser(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.getUser(id, token), res
    );
  }

  updateUser(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const bio = req.body.bio;
    const oldPassword = req.body.old_password;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.updateUser(username, email,
        name, password, bio, oldPassword, token), res
    );
  }

  deleteUser(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.deleteUser(id, token), res
    );
  }

  // Follows

  getFollowing(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.userClient.getFollowing(id, token, page, limit), res
    );
  }

  getFollowers(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.userClient.getFollowers(id, token, page, limit), res
    );
  }

  follow(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.follow(id, token), res
    );
  }

  unfollow(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.unfollow(id, token), res
    );
  }

  // Posts

  getPosts(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.postClient.getPosts(id, token, page, limit), res
    );
  }

  getLikedPosts(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    this.handleResponse(
      this.postClient.getLikedPosts(id, token, page, limit), res
    );
  }
}
