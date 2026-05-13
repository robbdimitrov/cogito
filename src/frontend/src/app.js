import React, {useState, useEffect, useCallback} from 'react';

import Navbar from './shared/components/navbar/navbar';
import IconLibrary from './shared/services/iconlibrary';
import {useRoutes, RouterContext} from './shared/router/router';
import {authGuard, unauthGuard} from './shared/router/guards';
import APIClient from './shared/services/apiclient';
import Session from './shared/services/session';

const Feed = React.lazy(() => import('./screens/feed/feed'));
const Profile = React.lazy(() => import('./screens/profile/profile'));
const Login = React.lazy(() => import('./screens/signup/login'));
const Signup = React.lazy(() => import('./screens/signup/signup'));
const Settings = React.lazy(() => import('./screens/settings/settings'));

IconLibrary.configure();

const apiClient = new APIClient();

const routes = [
  {id: 'feed', path: /\//, component: Feed, canAccess: authGuard},
  {id: 'profile', path: /\/(@\w+)(\/(following|followers|likes))?/, component: Profile, canAccess: authGuard},
  {id: 'settings', path: /\/settings\/(profile|password)\/?/, component: Settings, canAccess: authGuard},
  {id: 'login', path: /\/login/, component: Login, canAccess: unauthGuard},
  {id: 'signup', path: /\/signup/, component: Signup, canAccess: unauthGuard},
  {id: 'fallback', path: /.?/, component: Login, canAccess: unauthGuard},
];

function App() {
  const route = useRoutes(routes);
  const [isLoggedIn, setIsLoggedIn] = useState(Session.getUserId() !== null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [profileData] = useState({user: null, posts: [], users: []});

  const refreshUser = useCallback(() => {
    const userId = Session.getUserId();
    if (userId) {
      apiClient.getUser(userId)
        .then((data) => setUser(data))
        .catch(() => setUser(null));
    }
  }, []);

  const refreshFeed = useCallback(() => {
    if (!isLoggedIn) return;
    apiClient.getFeed(0)
      .then((data) => setPosts(data.items || []))
      .catch(() => setPosts([]));
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser();
      refreshFeed();
    }
  }, [isLoggedIn, refreshUser, refreshFeed]);

  const loginUser = (email, password) => {
    apiClient.login(email, password)
      .then((data) => {
        Session.setUserId(data.user_id);
        setIsLoggedIn(true);
        route.navigate('/');
      })
      .catch(() => alert('Login failed'));
  };

  const logoutUser = () => {
    apiClient.logout()
      .then(() => {
        Session.reset();
        setIsLoggedIn(false);
        setUser(null);
        route.navigate('/login');
      })
      .catch(() => alert('Logout failed'));
  };

  const registerUser = (name, username, email, password) => {
    apiClient.createUser(name, username, email, password)
      .then(() => {
        route.navigate('/login');
      })
      .catch(() => alert('Signup failed'));
  };

  const updateUser = (name, username, email, bio) => {
    if (!user) return;
    apiClient.updateUser(user.id, name, username, email, bio)
      .then(() => refreshUser())
      .catch(() => alert('Update failed'));
  };

  const updatePassword = (password, oldPassword) => {
    if (!user) return;
    apiClient.updatePassword(user.id, password, oldPassword)
      .then(() => route.navigate('/settings/profile'))
      .catch(() => alert('Password update failed'));
  };

  const renderComponent = () => {
    const routeId = route.id || 'fallback';
    if (routeId === 'feed') {
      return <Feed posts={posts} user={user} />;
    }
    if (routeId === 'profile') {
      return <Profile user={profileData.user} posts={profileData.posts} users={profileData.users} />;
    }
    if (routeId === 'settings') {
      return <Settings user={user} updateUser={updateUser} updatePassword={updatePassword} />;
    }
    if (routeId === 'login') {
      return <Login loginUser={loginUser} />;
    }
    if (routeId === 'signup') {
      return <Signup registerUser={registerUser} />;
    }
    return <Login loginUser={loginUser} />;
  };

  return (
    <RouterContext.Provider value={route}>
      <Navbar isLoggedIn={isLoggedIn} user={user} logoutUser={logoutUser} />

      <React.Suspense fallback={<div>Loading...</div>}>
        {renderComponent()}
      </React.Suspense>
    </RouterContext.Provider>
  );
}

export default App;
