import * as http from 'http';

import { APIRouter } from './api-router';

export class ImageRouter extends APIRouter {
  constructor(imageURI) {
    super();
    this.imageURI = imageURI;
  }

  connectRouter(router) {
    router.post('/', (req, res) => {
      let parts = this.imageURI.split(':');
      let options = {
        host: parts[0],
        port: parts[1],
        path: '/upload',
        method: 'POST',
        headers: req.headers
      };
      http.request(options, (resp) => {
        process.stdout.write(`StatusCode: ${resp.statusCode}\n`);

        resp.on('data', (data) => {
          process.stdout.write(`POST result: ${data}\n`);
          res.send(data);
        });
      });
    });

    router.get('/:id', (req, res) => {
      this.getSessions(req, res);
    });
  }
}
