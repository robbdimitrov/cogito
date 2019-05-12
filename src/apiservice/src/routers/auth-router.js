import { Router } from 'express';

import { getToken } from './utils';

export class AuthRouter {
  constructor(authClient) {
    this.authClient = authClient;
    this.router = new Router();
  }

  connectRouter(router) {
    router.get('/', (req, res) => {
      this.getSessions(req, res);
    });

    router.delete(`/:id(${this.validationRegex})`, (req, res) => {
      this.deleteSession(req, res);
    });


  }

  getSessions(req, res) {
    let token = getToken(req);
    this.authClient.getSessions(token)
        .then((result) => {
          res.send({
            'sessions': result
          });
        })
        .catch((err) => {
          res.status(400).send({
            'code': 400,
            'error': 'BAD_REQUEST',
            'message': err.message,
          });
        });
  }

  deleteSession(req, res) {

  }
}
