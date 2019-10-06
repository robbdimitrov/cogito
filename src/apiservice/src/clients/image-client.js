const http = require('http');

const APIClient = require('./api-client');

class ImageClient extends APIClient {
  uploadImage(req, res) {
    const parts = this.serviceURI.split(':');
    const options = {
      host: parts[0],
      port: parts[1],
      path: '/images',
      method: 'POST',
      headers: req.headers
    };

    const request = http.request(options, (response) => {
      response.setEncoding('utf8');
      let rawData = '';

      response.on('data', (chunk) => {
        rawData += chunk;
      }).on('end', () => {
        res.status(response.statusCode).send(rawData);
      }).on('close', () => {
        res.end();
      });
    }).on('error', () => {
      res.end();
    });

    req.on('data', (chunk) => {
      request.write(chunk);
    }).on('close', function(){
      request.end();
    });
  }

  getImage(req, res) {
    const parts = this.serviceURI.split(':');
    const options = {
      host: parts[0],
      port: parts[1],
      path: '/images/' + req.params.id,
      method: 'GET',
      headers: req.headers
    };

    const request = http.request(options, (response) => {
      response.on('data', (chunk) => {
        res.write(chunk);
      }).on('end', () => {
        res.end();
      }).on('close', () => {
        res.end();
      });
    }).on('error', () => {
      res.end();
    });

    request.end();
  }
}

module.exports = ImageClient;
