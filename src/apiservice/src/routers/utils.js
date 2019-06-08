export function getToken(req) {
  return req.headers['authorization'];
}
