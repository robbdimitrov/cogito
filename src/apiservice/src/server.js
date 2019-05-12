import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as helmet from 'helmet';

import { AuthClient } from './clients/auth-client';
import { PostClient } from './clients/post-client';
import { UserClient } from './clients/user-client';
import { AuthRouter } from './routers/auth-router';
import { PostRouter } from './routers/post-router';
import { UserRouter } from './routers/user-router';

export class Server {
  constructor(port, apiRoot, authURI, postURI, userURI) {
    this.port = port;
    this.apiRoot = apiRoot;
    this.authURI = authURI;
    this.postURI = postURI;
    this.userURI = userURI;

    this.app = express();
    this.routers = {};
    this.configure();
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
    let authClient = new AuthClient(this.authURI);
    let authRouter = new AuthRouter(authClient);
    this.routers['sessions'] = authRouter;

    let userClient = new UserClient(this.userURI);
    let userRouter = new UserRouter(userClient);
    this.routers['users'] = userRouter;

    let postClient = new PostClient(this.postURI);
    let postRouter = new PostRouter(postClient);
    this.routers['posts'] = postRouter;
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
    this.app.listen(this.port, () => {
      process.stdout.write(`We are live on ${this.port}\n`);
    });
  }
}
