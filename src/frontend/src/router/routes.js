const session = import('../shared/services/Session');
const Feed = React.lazy(() => import('../screens/feed/Feed'));
const Profile = React.lazy(() => import('../screens/profile/Profile'));
const Login = React.lazy(() => import('../screens/signup/Login'));
const Signup = React.lazy(() => import('../screens/signup/Login'));
const Settings = React.lazy(() => import('../screens/settings/Settings'));

function authGuard() {
  if (!session.userId()) {
    this.router.navigate(['/login']);
    return false;
  }
  return true;
}

const routes = [
  {
    path: '/feed',
    component: Feed,
    canActivate: authGuard
  },
  {
    path: '/users/:userId',
    component: Profile,
    canActivate: authGuard
  },
  {
    path: '/image/:imageId',
    component: Feed,
    canActivate: authGuard
  },
  {
    path: '/settings',
    component: Settings,
    canActivate: authGuard
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/signup',
    component: Signup
  },
  {
    path: '/',
    redirectTo: '/feed'
  }
];

//<Redirect from='/' exact to='/feed'/>
//<GuardRoute path='/feed' exact component={Feed} />
//<GuardRoute path='/thought' component={Feed} />
//<AuthedRoute path='/login' exact component={Login} />
//<AuthedRoute path='/signup' exact component={Signup} />
//<GuardRoute path='/settings' component={Settings} />
//<GuardRoute path='/:userId' component={Profile} />

export default routes;
