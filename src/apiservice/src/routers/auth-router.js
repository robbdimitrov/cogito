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

    router.delete(`/:id`, (req, res) => {
      this.deleteSession(req, res);
    });

    router.post('/', (req, res) => {
      if (req.body.email !== undefined) {
        this.login(req, res);
      } else {
        this.refreshToken(req, res);
      }
    });
  }

  // Authentication

  login(req, res) {
    let email = req.body.email;
    let password = req.body.password;
    let userAgent = req.headers['user-agent'];

    this.authClient.createSession(email, password, userAgent)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  refreshToken(req, res) {
    let token = getToken(req);

    this.authClient.refreshToken(token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  // Sessions

  getSessions(req, res) {
    let token = getToken(req);

    this.authClient.getSessions(token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }

  deleteSession(req, res) {
    let token = getToken(req);
    let sessionId = req.params.id;

    this.authClient.deleteSession(sessionId, token)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        let code = err['code'] !== undefined ? err.code : 400;
        res.status(code).send(err);
      });
  }
}
