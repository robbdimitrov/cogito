const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');

const AuthClient = require('./clients/auth-client');
const AuthRouter = require('./routers/auth-router');
const PostClient = require('./clients/post-client');
const PostRouter = require('./routers/post-router');
const UserClient = require('./clients/user-client');
const UserRouter = require('./routers/user-router');
const ImageClient = require('./clients/image-client');
const ImageRouter = require('./routers/image-router');

class Server {
  constructor(port, authURI, userURI, postURI, imageURI) {
    this.port = port;
    this.authURI = authURI;
    this.userURI = userURI;
    this.postURI = postURI;
    this.imageURI = imageURI;

    this.app = express();
    this.routers = {};
  }

  // Configure Express middleware
  configure() {
    this.configureLogger();
    this.app.use(bodyParser.json());
    this.app.use(helmet());
    this.configureRouters();
    this.connectRouters();
  }

  configureLogger() {
    this.app.use((req, res, next) => {
      process.stdout.write(`[${process.env.NODE_ENV}] REQUEST ${req.method} ${req.url}\n`);
      next();
    });
  }

  // Create API routers
  configureRouters() {
    const userClient = new UserClient(this.userURI);
    const authClient = new AuthClient(this.authURI, userClient);
    const authRouter = new AuthRouter(authClient);
    this.routers.sessions = authRouter;

    const postClient = new PostClient(this.postURI);
    const postRouter = new PostRouter(postClient);
    this.routers.posts = postRouter;

    const userRouter = new UserRouter(userClient, postClient);
    this.routers.users = userRouter;

    const imageClient = new ImageClient(this.imageURI);
    const imageRouter = new ImageRouter(imageClient);
    this.routers.images = imageRouter;
  }

  // Configure API endpoints
  connectRouters() {
    // Create and map express routers
    for (const key in this.routers) {
      if (Object.prototype.hasOwnProperty.call(this.routers, key)) {
        const value = this.routers[key];
        this.app.use(`/api/${key}`, value.router);
      }
    }
  }

  // Setup state and start server
  start() {
    this.configure();

    this.app.listen(this.port, () => {
      process.stdout.write(`Starting server on port ${this.port}\n`);
    });
  }
}

module.exports = Server;
