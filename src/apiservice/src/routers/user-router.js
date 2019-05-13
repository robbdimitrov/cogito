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

    router.delete(`/:id`, (req, res) => {
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

  // User

  createUser(req, res) {

  }

  getUser(req, res) {

  }

  updateUser(req, res) {

  }

  deleteUser(req, res) {

  }


  // Follow

  getFollowing(req, res) {

  }

  getFollowers(req, res) {

  }

  follow(req, res) {

  }

  unfollow(req, res) {

  }
}
