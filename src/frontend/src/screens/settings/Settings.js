import React from 'react';
import {Route, Redirect, Switch} from 'react-router-dom';

import SettingsMenu from './settingsmenu/SettingsMenu';
import './Settings.scss';

const Password = React.lazy(() => import('./Password'));
const EditProfile = React.lazy(() => import('./EditProfile'));

function Settings({match}) {
  return (
    <div className='settings-container'>
      <SettingsMenu />

      <div className='settings-content main-content'>
        <Switch>
          <Route path={`${match.path}/account`} exact component={EditProfile} />
          <Route path={`${match.path}/password`} exact component={Password} />
          <Route
            path={match.path} exact
            render={() => <Redirect to={`${match.path}/account`} />}
          />
        </Switch>
      </div>
    </div>
  );
}

export default Settings;
