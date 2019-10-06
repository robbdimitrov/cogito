const APIRouter = require('./api-router');

class UserRouter extends APIRouter {
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

    router.get('/', (req, res) => {
      this.getUser(req, res);
    });

    router.get('/:id', (req, res) => {
      this.getUser(req, res);
    });

    router.put('/:id', (req, res) => {
      if (req.body.password && req.body.old_password) {
        this.updatePassword(req, res);
      } else {
        this.updateUser(req, res);
      }
    });

    router.delete('/:id', (req, res) => {
      this.deleteUser(req, res);
    });

    // Followers

    router.get('/:id/following', (req, res) => {
      if (req.query.ids) {
        this.getFollowingIds(req, res);
      } else {
        this.getFollowing(req, res);
      }
    });

    router.get('/:id/followers', (req, res) => {
      if (req.query.ids) {
        this.getFollowersIds(req, res);
      } else {
        this.getFollowers(req, res);
      }
    });

    router.post('/:id/followers', (req, res) => {
      this.followUser(req, res);
    });

    router.delete('/:id/followers/:followerId', (req, res) => {
      this.unfollowUser(req, res);
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
    const username = req.query.username;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.getUser(id, username, token), res
    );
  }

  updateUser(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const name = req.body.name;
    const bio = req.body.bio;
    const avatar = req.body.avatar;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.updateUser(username, email,
        name, bio, avatar, token), res
    );
  }

  updatePassword(req, res) {
    const password = req.body.password;
    const oldPassword = req.body.old_password;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.updateUser(password, oldPassword, token), res
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

  getFollowingIds(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.getFollowingIds(id, token), res
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

  getFollowersIds(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.getFollowersIds(id, token), res
    );
  }

  followUser(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.followUser(id, token), res
    );
  }

  unfollowUser(req, res) {
    const id = req.params.id;
    const token = this.getToken(req);

    this.handleResponse(
      this.userClient.unfollowUser(id, token), res
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

module.exports = UserRouter;
