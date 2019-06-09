import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as helmet from 'helmet';

import { AuthClient } from './clients/auth-client';
import { AuthRouter } from './routers/auth-router';
import { PostClient } from './clients/post-client';
import { PostRouter } from './routers/post-router';
import { UserClient } from './clients/user-client';
import { UserRouter } from './routers/user-router';
import { ImageClient } from './clients/image-client';
import { ImageRouter } from './routers/image-router';

export class Server {
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
    const authClient = new AuthClient(this.authURI);
    const authRouter = new AuthRouter(authClient);
    this.routers['sessions'] = authRouter;

    const userClient = new UserClient(this.userURI);
    const userRouter = new UserRouter(userClient);
    this.routers['users'] = userRouter;

    const postClient = new PostClient(this.postURI);
    const postRouter = new PostRouter(postClient);
    this.routers['posts'] = postRouter;

    const imageClient = new ImageClient(this.imageURI);
    const imageRouter = new ImageRouter(imageClient);
    this.routers['images'] = imageRouter;
  }

  // Configure API endpoints
  connectRouters() {
    // Create and map express routers
    for (const key in this.routers) {
      if (this.routers.hasOwnProperty(key)) {
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
