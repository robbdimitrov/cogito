export function getToken(req) {
  return req.body.token || req.query.token || req.headers['x-access-token'];
}
