import React from 'react';
import { Route, Redirect } from 'react-router-dom';

import session from './Session';

function GuardRoute({ component: Component, ...rest }) {
  return (
    <Route {...rest} render={(props) => (
      session.isAuthenticated()
        ? <Component {...props} />
        : <Redirect to='/login' />
    )} />
  );
}

export default GuardRoute;
