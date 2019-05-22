export function getToken(req) {
  return req.headers['x-access-token'];
}
