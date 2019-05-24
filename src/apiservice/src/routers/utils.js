export function getToken(req) {
  return req.headers['X-Access-Token'];
}
