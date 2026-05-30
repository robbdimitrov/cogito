import React, {useState, useEffect, useCallback} from 'react';

import Navbar from './shared/components/navbar/navbar';
import BottomNav from './shared/components/bottomnav/bottomnav';
import ErrorBoundary from './shared/components/errorboundary/errorboundary';
import Loading from './shared/components/loading/loading';
import ToastProvider, {useToast} from './shared/components/toast/toast';
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
const PostDetail = React.lazy(() => import('./screens/post/post'));
const Search = React.lazy(() => import('./screens/search/search'));

const apiClient = new APIClient();

const routes = [
  {id: 'feed', path: /^\/$/, component: Feed, canAccess: authGuard, title: 'Feed'},
  {id: 'profile', path: /\/@\w+(\/(following|followers|likes))?/, component: Profile, canAccess: authGuard, title: 'Profile'},
  {id: 'post', path: /\/posts\/(\d+)/, component: PostDetail, canAccess: authGuard, title: 'Post'},
  {id: 'search', path: /\/search/, component: Search, canAccess: authGuard, title: 'Search'},
  {id: 'settings', path: /\/settings\/(profile|password|sessions)\/?/, component: Settings, canAccess: authGuard, title: 'Settings'},
  {id: 'login', path: /\/login/, component: Login, canAccess: unauthGuard, title: 'Log In'},
  {id: 'signup', path: /\/signup/, component: Signup, canAccess: unauthGuard, title: 'Sign Up'},
  {id: 'fallback', path: /.?/, component: Login, canAccess: unauthGuard, title: 'Log In'},
];

function AppContent() {
  const toast = useToast();
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
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);

  const refreshUser = useCallback(() => {
    const userId = Session.getUserId();
    if (userId) {
      apiClient.getUser(userId)
        .then((data) => setUser(data))
        .catch(() => setUser(null));
    }
  }, []);

  const fetchSessions = useCallback(() => {
    setSessionsError(null);
    return apiClient.getSessions()
      .then((data) => {
        setSessions(data.sessions || []);
        setCurrentSessionId(data.currentSessionId || null);
      })
      .catch(() => setSessionsError('Failed to load sessions.'));
  }, []);

  const refreshFeed = useCallback(() => {
    if (!isLoggedIn) return;
    setIsFeedLoading(true);

    const doRefresh = async () => {
      try {
        const data = await apiClient.getFeed(0);
        const rawPosts = data.items || [];

        const userIds = [...new Set(rawPosts.map((p) => p.userId))];
        const userMap = {};
        await Promise.all(
          userIds.map(async (uid) => {
            try {
              const u = await apiClient.getUser(uid);
              userMap[uid] = u;
            } catch {
              userMap[uid] = null;
            }
          })
        );

        const postsWithAuthors = rawPosts.map((p) => ({
          ...p,
          user: userMap[p.userId],
        }));
        setPosts(postsWithAuthors);
      } catch {
        setPosts([]);
      } finally {
        setIsFeedLoading(false);
      }
    };

    doRefresh();
  }, [isLoggedIn]);

  const fetchProfile = useCallback(async (username, subroute) => {
    if (!isLoggedIn) return;
    setIsProfileLoading(true);
    try {
      const profileUser = await apiClient.getUserByUsername(username);
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
      setProfileData((prev) => ({user: prev.user, posts: [], users: []}));
    } finally {
      setIsProfileLoading(false);
    }
  }, [isLoggedIn]);

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
    return apiClient.login(email, password)
      .then((data) => {
        Session.setUserId(data.id);
        setIsLoggedIn(true);
        toast.success('Welcome back!');
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
    return apiClient.createUser(name, username, email, password)
      .then(() => {
        toast.success('Account created! Please log in.');
        route.navigate('/login');
      })
      .catch(() => setSignupError('Registration failed. Please try again.'));
  };

  const updateUser = (name, username, email, bio) => {
    if (!user) return Promise.resolve();
    setUpdateError(null);
    return apiClient.updateUser(user.id, name, username, email, bio)
      .then(() => {
        refreshUser();
        toast.success('Profile updated.');
      })
      .catch(() => setUpdateError('Profile update failed. Please try again.'));
  };

  const updatePassword = (password, oldPassword) => {
    if (!user) return Promise.resolve();
    setPasswordError(null);
    return apiClient.updatePassword(user.id, password, oldPassword)
      .then(() => {
        toast.success('Password updated.');
        route.navigate('/settings/profile');
      })
      .catch(() => setPasswordError('Password update failed. Please try again.'));
  };

  const deleteSessionHandler = (sessionId) => {
    setSessionsError(null);
    return apiClient.deleteSession(sessionId)
      .then(() => toast.success('Session terminated.'))
      .catch(() => setSessionsError('Failed to delete session.'));
  };

  const createPost = (content) => {
    return apiClient.createPost(content)
      .then(() => {
        toast.success('Thought posted.');
        refreshFeed();
        refreshUser();
      })
      .catch(() => toast.error('Failed to post. Try again.'));
  };

  const handleLike = useCallback(async (post) => {
    try {
      if (post.liked) {
        await apiClient.unlikePost(post.id);
      } else {
        await apiClient.likePost(post.id);
      }
      refreshFeed();
      refreshUser();
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
      toast.error('Action failed. Try again.');
    }
  }, [refreshFeed, refreshUser, route.id, route.path, fetchProfile, toast]);

  const handleRepost = useCallback(async (post) => {
    try {
      if (post.reposted) {
        await apiClient.removeRepost(post.id);
      } else {
        await apiClient.repostPost(post.id);
      }
      refreshFeed();
      refreshUser();
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
      toast.error('Action failed. Try again.');
    }
  }, [refreshFeed, refreshUser, route.id, route.path, fetchProfile, toast]);

  const handleFollow = useCallback((userId) => {
    apiClient.followUser(userId)
      .then(() => {
        toast.success('Following!');
        if (route.id === 'profile') {
          const match = route.path.match(/\/@(\w+)(\/\w+)?/);
          if (match) {
            fetchProfile(match[1], match[2]);
          }
        }
        refreshUser();
      })
      .catch(() => toast.error('Follow failed. Try again.'));
  }, [route.id, route.path, fetchProfile, refreshUser, toast]);

  const handleUnfollow = useCallback((userId) => {
    apiClient.unfollowUser(userId)
      .then(() => {
        toast.info('Unfollowed.');
        if (route.id === 'profile') {
          const match = route.path.match(/\/@(\w+)(\/\w+)?/);
          if (match) {
            fetchProfile(match[1], match[2]);
          }
        }
        refreshUser();
      })
      .catch(() => toast.error('Unfollow failed. Try again.'));
  }, [route.id, route.path, fetchProfile, refreshUser, toast]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      await apiClient.deletePost(postId);
      toast.success('Post deleted.');
      refreshFeed();
      refreshUser();
      if (route.id === 'profile') {
        const match = route.path.match(/\/@(\w+)(\/\w+)?/);
        if (match) {
          fetchProfile(match[1], match[2]);
        }
      }
    } catch (e) {
      toast.error('Delete failed. Try again.');
    }
  }, [refreshFeed, refreshUser, route.id, route.path, fetchProfile, toast]);

  const renderComponent = () => {
    const routeId = route.id || 'fallback';
    if (routeId === 'feed') {
      return <Feed posts={posts} user={user} isLoading={isFeedLoading} onLike={handleLike} onRepost={handleRepost} onCreatePost={createPost} onDeletePost={handleDeletePost} currentUserId={user?.id} />;
    }
    if (routeId === 'profile') {
      return <Profile user={profileData.user} posts={profileData.posts} users={profileData.users} isLoading={isProfileLoading} onLike={handleLike} onRepost={handleRepost} currentUser={user} onFollow={handleFollow} onUnfollow={handleUnfollow} onDeletePost={handleDeletePost} />;
    }
    if (routeId === 'post') {
      const match = route.path.match(/\/posts\/(\d+)/);
      const postId = match ? match[1] : null;
      return <PostDetail postId={postId} onDeleted={() => route.navigate('/')} />;
    }
    if (routeId === 'search') {
      return <Search />;
    }
    if (routeId === 'settings') {
      return <Settings user={user} updateUser={updateUser} updatePassword={updatePassword} updateError={updateError} passwordError={passwordError} sessions={sessions} currentSessionId={currentSessionId} fetchSessions={fetchSessions} sessionsError={sessionsError} deleteSession={deleteSessionHandler} />;
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
      {isLoggedIn && <BottomNav user={user} />}
    </RouterContext.Provider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
