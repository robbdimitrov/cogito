import React from 'react';

import Navbar from './shared/components/navbar/navbar';
import IconLibrary from './shared/services/iconlibrary';
import {useRoutes, RouterContext} from './shared/router/router';
import {authGuard, unauthGuard} from './shared/router/guards';

const Feed = React.lazy(() => import('./screens/feed/feed'));
const Profile = React.lazy(() => import('./screens/profile/profile'));
const Login = React.lazy(() => import('./screens/signup/login'));
const Signup = React.lazy(() => import('./screens/signup/signup'));
const Settings = React.lazy(() => import('./screens/settings/settings'));

IconLibrary.configure();

const routes = [
  {path: '/', component: Feed, canAccess: authGuard},
  {path: /\/(@\w+)(\/(following|followers|likes))?/, component: Profile, canAccess: authGuard},
  {path: /\/(@\w+)\/([\w\d]+)/, component: Feed, canAccess: authGuard},
  {path: /\/(@\w+)/, component: Profile, canAccess: authGuard},
  {path: /\/settings\/(profile|password)\/?/, component: Settings, canAccess: authGuard},
  {path: '/login', component: Login, canAccess: unauthGuard},
  {path: '/signup', component: Signup, canAccess: unauthGuard},
  {path: /.?/, component: Login, canAccess: unauthGuard},
];

function App() {
  const route = useRoutes(routes);

  return (
    <RouterContext.Provider value={route}>
      <Navbar />

      <React.Suspense fallback={<div>Loading...</div>}>
        {route.component &&
          <route.component />
        }
      </React.Suspense>
    </RouterContext.Provider>
  );
}

export default App;
