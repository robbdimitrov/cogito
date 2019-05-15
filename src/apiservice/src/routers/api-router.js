import { Router } from 'express';

export class APIRouter {
  constructor() {
    this.router = new Router();
    this.connectRouter();
  }

  connectRouter() {
    // Implemented by subclasses
  }

  handleResponse(promise, res) {
    promise.then((result) => {
      res.send(result);
    }).catch((err) => {
      let code = err['code'] !== undefined ? err.code : 500;
      res.status(code).send(err);
    });
  }
}
