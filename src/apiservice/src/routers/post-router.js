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
    })

    router.delete(`/:id`, (req, res) => {
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

  }

  getPost(req, res) {

  }

  getPosts(req, res) {

  }

  getLikedPosts(req, res) {

  }

  deletePost(req, res) {

  }

  // Actions

  likePost(req, res) {

  }

  unlikePost(req, res) {

  }

  retweetPost(req, res) {

  }

  removeRetweet(req, res) {

  }
}
