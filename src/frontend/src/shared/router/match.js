export function match(routes, path) {
  for (let route of routes) {
    if (route.path.test(path)) {
      return route;
    }
  }
  return null;
}
