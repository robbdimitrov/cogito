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
  constructor(port, apiRoot) {
    this.port = port;
    this.apiRoot = apiRoot;

    this.app = express();
    this.routers = {};
    this.config = {};
  }

  // Configure Express middleware
  configure() {
    this.configureLogger();
    this.configureBodyParser();
    this.app.use(helmet());
    this.configureRouters();
    this.connectRouters();
  }

  configureBodyParser() {
    this.app.use(bodyParser.urlencoded({extended: true}));
  }

  configureLogger() {
    this.app.use((req, res, next) => {
      process.stdout.write(`[${process.env.NODE_ENV}] REQUEST ${req.method} ${req.url}\n`);
      next();
    });
  }

  // Create API routers
  configureRouters() {
    let authClient = new AuthClient(this.config['AUTH_URI']);
    let authRouter = new AuthRouter(authClient);
    this.routers['sessions'] = authRouter;

    let userClient = new UserClient(this.config['USER_URI']);
    let userRouter = new UserRouter(userClient);
    this.routers['users'] = userRouter;

    let postClient = new PostClient(this.config['POST_URI']);
    let postRouter = new PostRouter(postClient);
    this.routers['posts'] = postRouter;

    let imageClient = new ImageClient(this.config['IMAGE_URI']);
    let imageRouter = new ImageRouter(imageClient);
    this.routers['images'] = imageRouter;
  }

  // Configure API endpoints
  connectRouters() {
    let apiRoot = this.apiRoot;

    // Create and map express routers
    for (let key in this.routers) {
      if (this.routers.hasOwnProperty(key)) {
        let value = this.routers[key];
        this.app.use(`/${apiRoot}/${key}`, value.router);
      }
    }
  }

  // Connect to database and start listening to port
  start() {
    this.configure();

    this.app.listen(this.port, () => {
      process.stdout.write(`We are live on ${this.port}\n`);
    });
  }
}
