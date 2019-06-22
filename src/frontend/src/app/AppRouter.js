import React, { Suspense } from 'react';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';

import GuardRoute from '../common/GuardRoute';

const Feed = React.lazy(() => import('../feed/Feed'));
const Profile = React.lazy(() => import('../profile/Profile'));
const Login = React.lazy(() => import('../user/Login'));
const Signup = React.lazy(() => import('../user/Signup'));
const Settings = React.lazy(() => import('../settings/Settings'));

function AppRouter(props) {
  return (
    <BrowserRouter>
      {props.children}

      <Suspense fallback={<div>Loading...</div>}>
        <Switch>
          <Redirect from="/" exact to="/feed"/>
          <GuardRoute path="/feed" exact component={Feed} />
          <GuardRoute path="/thought" component={Feed} />
          <Route path="/login" exact component={Login} />
          <Route path="/signup" exact component={Signup} />
          <GuardRoute path="/settings" component={Settings} />
          <GuardRoute path="/:userId" component={Profile} />
        </Switch>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
