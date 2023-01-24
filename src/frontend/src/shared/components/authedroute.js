import React from 'react';
import {Route, Redirect} from 'react-router-dom';

import session from '../../services/Session';

function AuthedRoute({component: Component, ...rest}) {
  return (
    <Route {...rest} render={(props) => (
      !session.isAuthenticated()
        ? <Component {...props} />
        : <Redirect to='/' />
    )} />
  );
}

export default AuthedRoute;
