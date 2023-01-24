import React from 'react';

import {match} from './match';

export const RouterContext = React.createContext({});
const initialPath = window.location.pathname;

export function useRouter() {
  return React.useContext(RouterContext);
}

export function useRoutes(routes) {
  const [path, setPath] = React.useState(initialPath);
  const route = match(routes, path);

  React.useEffect(() => {
    window.onpopstate = () => {
      setPath(window.location.pathname);
    }
  });

  const navigate = (url, rewrite) => {
    if (url === path) {
      return;
    }
    const method = rewrite ? 'replace' : 'push';
    window.history[`${method}State`](null, '', url);
    setPath(url);
  };

  if (route.canAccess) {
    const state = route.canAccess();
    if (!state.allowed) {
      navigate(state.redirectTo, true);
    }
  }

  return {
    navigate, path,
    component: route.component,
  };
}
