import { Router } from 'express';

export class APIRouter {
  constructor() {
    this.router = new Router();
    this.connectRouter(this.router);
  }

  connectRouter() {
    // Implemented by subclasses
  }

  getToken(req) {
    return req.get('Authorization');
  }

  handleResponse(promise, res) {
    promise.then((result) => {
      res.send(result);
    }).catch((error) => {
      const code = error.code || 500;
      res.status(code).send({ error });
    });
  }
}
