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
    const request = http.request(options);
    req.pipe(request).pipe(res);
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
    const request = http.request(options);
    request.pipe(res);
  }
}

module.exports = ImageClient;
