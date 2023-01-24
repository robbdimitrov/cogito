export function match(routes, path) {
  for (let route of routes) {
    if (
      (typeof route.path === 'string' && route.path === path)
      || (typeof route.path === 'object' && route.path.test(path))
    ) {
      return route;
    }
  }

  return null;
}
