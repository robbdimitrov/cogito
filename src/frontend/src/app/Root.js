import React from 'react';
import { withRouter } from 'react-router-dom';

import Navigation from '../common/components/navigation/Navigation';
import { dismissError } from '../store/actions/errors';
import session from '../common/services/Session';
import { fetchUserIfNeeded } from '../store/actions/users';
import { logoutUser } from '../store/actions/auth';

class Root extends React.Component {
  constructor(props) {
    super(props);

    this.openPopup = this.openPopup.bind(this);
    this.closePopup = this.closePopup.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.dismissError = this.dismissError.bind(this);
  }

  componentDidMount() {
    const userId = session.getUserId();
    this.props.fetchUserIfNeeded(userId);
  }

  componentDidUpdate(prevProps) {
    const { isLoggedIn } = this.props;

    if(prevProps.isLoggedIn !== isLoggedIn) {
      if (isLoggedIn) {
        this.props.history.push('/');
      } else {
        this.props.history.push('/login');
      }
    }
  }

  handleLogout() {
    this.props.logoutUser();
  }

  dismissError() {
    this.props.dismissError(this.props.error.id);
  }

  render() {
    return (
      <React.Fragment>
        <Navigation
          user={this.props.user}
          logoutUser={this.handleLogout}
          isLoggedIn={this.props.isLoggedIn}
        />
      </React.Fragment>
    );
  }
}

export default withRouter(Root);
