const {createProxyMiddleware} = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    createProxyMiddleware({
      pathFilter: '/api',
      target: 'http://localhost:8080',
      pathRewrite: {
        '^/api': ''
      }
    })
  );
};
