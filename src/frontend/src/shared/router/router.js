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
    const handlePopState = () => {
      setPath(window.location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (url, rewrite) => {
    if (url === path) {
      return;
    }
    const method = rewrite ? 'replace' : 'push';
    window.history[`${method}State`](null, '', url);
    setPath(url);
    window.scrollTo(0, 0);
  };

  if (route.canAccess) {
    const state = route.canAccess();
    if (!state.allowed) {
      navigate(state.redirectTo, true);
    }
  }

  return {
    navigate, path,
    id: route.id,
    component: route.component,
  };
}
