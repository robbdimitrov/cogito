import * as http from 'http';

import { APIClient } from './api-client';

export class ImageClient extends APIClient {
  uploadImage(req, res) {
    let parts = this.serviceURI.split(':');
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
      process.stderr.write(`Error happened ${err}`);
      res.writeHead(500);
      res.end();
    });

    req.on('data', (chunk) => {
      request.write(chunk);
    }).on('close', function(){
      request.end();
    });
  }

  getImage(req, res) {
    process.stdout.write(`Getting ${req.params.id}\n`);

    let parts = this.serviceURI.split(':');
    let options = {
      host: parts[0],
      port: parts[1],
      path: '/images/' + req.params.id,
      method: 'GET',
      headers: req.headers
    };

    process.stdout.write(`Options ${JSON.stringify(options)}\n`);

    let request = http.request(options, (response) => {
      let rawData = '';

      response.on('data', (chunk) => {
        rawData += chunk;
      }).on('end', () => {
        res.status(response.statusCode).send(rawData);
      }).on('close', () => {
        res.end();
      });
    }).on('error', (err) => {
      process.stderr.write(`Error happened ${err}`);
      res.writeHead(500);
      res.end();
    });

    req.on('data', (chunk) => {
      request.write(chunk);
    }).on('close', function(){
      // request.end();
    });
  }
}
