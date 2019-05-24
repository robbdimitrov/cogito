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

      let request = http.request(options, (response) => {
        response.setEncoding('utf8');
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        }).on('end', () => {
          res.status(response.statusCode).send(rawData);
        }).on('close', () => {
          res.end();
        });
      }).on('error', (err) => {
        process.stderr.write(`Error happened while uploading data ${err}`);
        res.writeHead(500);
        res.end();
      });

      req.on('data', (chunk) => {
        request.write(chunk);
      }).on('end', function(){
        request.end();
      }).on('close', function(){
        request.end();
      });
    });

    router.get('/:id', (req, res) => {
      this.getSessions(req, res);
    });
  }
}
