import React, {useState, useEffect, useCallback} from 'react';

import Navbar from './shared/components/navbar/navbar';
import ErrorBoundary from './shared/components/errorboundary/errorboundary';
import Loading from './shared/components/loading/loading';
import IconLibrary from './shared/services/iconlibrary';
import {useRoutes, RouterContext} from './shared/router/router';
import {authGuard, unauthGuard} from './shared/router/guards';
import APIClient from './shared/services/apiclient';
import Session from './shared/services/session';
import useDocumentTitle from './shared/hooks/usedocumenttitle';

const Feed = React.lazy(() => import('./screens/feed/feed'));
const Profile = React.lazy(() => import('./screens/profile/profile'));
const Login = React.lazy(() => import('./screens/signup/login'));
const Signup = React.lazy(() => import('./screens/signup/signup'));
const Settings = React.lazy(() => import('./screens/settings/settings'));

IconLibrary.configure();

const apiClient = new APIClient();

const routes = [
  {id: 'feed', path: /^\/$/, component: Feed, canAccess: authGuard, title: 'Feed'},
  {id: 'profile', path: /\/@\w+(\/(following|followers|likes))?/, component: Profile, canAccess: authGuard, title: 'Profile'},
  {id: 'settings', path: /\/settings\/(profile|password)\/?/, component: Settings, canAccess: authGuard, title: 'Settings'},
  {id: 'login', path: /\/login/, component: Login, canAccess: unauthGuard, title: 'Log In'},
  {id: 'signup', path: /\/signup/, component: Signup, canAccess: unauthGuard, title: 'Sign Up'},
  {id: 'fallback', path: /.?/, component: Login, canAccess: unauthGuard, title: 'Log In'},
];

function App() {
  const route = useRoutes(routes);
  const pageTitle = route.title
    ? (route.id === 'profile' && route.path.match(/\/(@\w+)/))
      ? `${route.path.match(/\/(@\w+)/)[1]} — Thoughts`
      : `${route.title} — Thoughts`
    : 'Thoughts';
  useDocumentTitle(pageTitle);

  const [isLoggedIn, setIsLoggedIn] = useState(Session.getUserId() !== null);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [profileData, setProfileData] = useState({user: null, posts: [], users: []});
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [signupError, setSignupError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

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
    setIsFeedLoading(true);
    apiClient.getFeed(0)
      .then((data) => setPosts(data.items || []))
      .catch(() => setPosts([]))
      .finally(() => setIsFeedLoading(false));
  }, [isLoggedIn]);

  const fetchProfile = useCallback(async (username, subroute) => {
    if (!isLoggedIn) return;
    setIsProfileLoading(true);
    try {
      let profileUser;
      if (user && user.username === username) {
        profileUser = user;
      } else {
        profileUser = await apiClient.getUserByUsername(username);
      }
      if (!profileUser) {
        setProfileData({user: null, posts: [], users: []});
        return;
      }
      if (subroute === '/likes') {
        const data = await apiClient.getLikes(profileUser.id, 0);
        setProfileData({user: profileUser, posts: data.items || [], users: []});
      } else if (subroute === '/following') {
        const data = await apiClient.getFollowing(profileUser.id, 0);
        setProfileData({user: profileUser, posts: [], users: data.items || []});
      } else if (subroute === '/followers') {
        const data = await apiClient.getFollowers(profileUser.id, 0);
        setProfileData({user: profileUser, posts: [], users: data.items || []});
      } else {
        const data = await apiClient.getPosts(profileUser.id, 0);
        setProfileData({user: profileUser, posts: data.items || [], users: []});
      }
    } catch {
      setProfileData({user: null, posts: [], users: []});
    } finally {
      setIsProfileLoading(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser();
      refreshFeed();
    }
  }, [isLoggedIn, refreshUser, refreshFeed]);

  useEffect(() => {
    if (route.id !== 'profile' || !isLoggedIn) {
      return;
    }
    const match = route.path.match(/\/@(\w+)(\/\w+)?/);
    if (!match) {
      return;
    }
    const [, username, subroute] = match;
    fetchProfile(username, subroute);
  }, [route.id, route.path, isLoggedIn, fetchProfile]);

  const loginUser = (email, password) => {
    setLoginError(null);
    apiClient.login(email, password)
      .then((data) => {
        Session.setUserId(data.user_id);
        setIsLoggedIn(true);
        route.navigate('/');
      })
      .catch(() => setLoginError('Invalid email or password. Please try again.'));
  };

  const logoutUser = () => {
    apiClient.logout()
      .then(() => {
        Session.reset();
        setIsLoggedIn(false);
        setUser(null);
        route.navigate('/login');
      })
      .catch(() => {});
  };

  const registerUser = (name, username, email, password) => {
    setSignupError(null);
    apiClient.createUser(name, username, email, password)
      .then(() => {
        route.navigate('/login');
      })
      .catch(() => setSignupError('Registration failed. Please try again.'));
  };

  const updateUser = (name, username, email, bio) => {
    if (!user) return;
    setUpdateError(null);
    apiClient.updateUser(user.id, name, username, email, bio)
      .then(() => refreshUser())
      .catch(() => setUpdateError('Profile update failed. Please try again.'));
  };

  const updatePassword = (password, oldPassword) => {
    if (!user) return;
    setPasswordError(null);
    apiClient.updatePassword(user.id, password, oldPassword)
      .then(() => route.navigate('/settings/profile'))
      .catch(() => setPasswordError('Password update failed. Please try again.'));
  };

  const handleLike = useCallback(async (post) => {
    try {
      if (post.liked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }
      refreshFeed();
      if (route.id === 'profile') {
        const match = route.path.match(/\/@(\w+)(\/\w+)?/);
        if (match) {
          const [, username, subroute] = match;
          if (!subroute || subroute === '/likes') {
            fetchProfile(username, subroute);
          }
        }
      }
    } catch (e) {
      console.error('Like action failed', e);
    }
  }, [refreshFeed, route.id, route.path, fetchProfile]);

  const handleRepost = useCallback(async (post) => {
    try {
      if (post.reposted) {
        await apiClient.removeRepost(post.id);
      } else {
        await apiClient.repostPost(post.id);
      }
      refreshFeed();
      if (route.id === 'profile') {
        const match = route.path.match(/\/@(\w+)(\/\w+)?/);
        if (match) {
          const [, username, subroute] = match;
          if (!subroute) {
            fetchProfile(username, subroute);
          }
        }
      }
    } catch (e) {
      console.error('Repost action failed', e);
    }
  }, [refreshFeed, route.id, route.path, fetchProfile]);

  const renderComponent = () => {
    const routeId = route.id || 'fallback';
    if (routeId === 'feed') {
      return <Feed posts={posts} user={user} isLoading={isFeedLoading} onLike={handleLike} onRepost={handleRepost} />;
    }
    if (routeId === 'profile') {
      return <Profile user={profileData.user} posts={profileData.posts} users={profileData.users} isLoading={isProfileLoading} onLike={handleLike} onRepost={handleRepost} />;
    }
    if (routeId === 'settings') {
      return <Settings user={user} updateUser={updateUser} updatePassword={updatePassword} updateError={updateError} passwordError={passwordError} />;
    }
    if (routeId === 'login') {
      return <Login loginUser={loginUser} error={loginError} />;
    }
    if (routeId === 'signup') {
      return <Signup registerUser={registerUser} error={signupError} />;
    }
    return <Login loginUser={loginUser} error={loginError} />;
  };

  return (
    <RouterContext.Provider value={route}>
      <Navbar isLoggedIn={isLoggedIn} user={user} logoutUser={logoutUser} />
      <ErrorBoundary>
        <React.Suspense fallback={<Loading />}>
          {renderComponent()}
        </React.Suspense>
      </ErrorBoundary>
    </RouterContext.Provider>
  );
}

export default App;
