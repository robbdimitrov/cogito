import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';

import Navigation from '../common/components/navigation/Navigation';
import Overlay from '../common/components/overlay/Overlay';
import ThoughtBox from '../common/components/thoughtbox/ThoughtBox';
import ErrorPopup from '../common/components/errorpopup/ErrorPopup';
import { dismissError } from '../store/actions/errors';
import session from '../common/services/Session';
import { fetchUserIfNeeded } from '../store/actions/users';
import { logoutUser } from '../store/actions/auth';

class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPopupShown: false
    };

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

  openPopup() {
    this.setState({
      isPopupShown: true
    });
  }

  closePopup() {
    this.setState({
      isPopupShown: false
    });
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
        {this.state.isPopupShown &&
          <Overlay>
            <ThoughtBox
              closePopup={this.closePopup}
            />
          </Overlay>
        }

        <Navigation
          user={this.props.user}
          openPopup={this.openPopup}
          logoutUser={this.handleLogout}
          isLoggedIn={this.props.isLoggedIn}
        />

        {this.props.error &&
          <ErrorPopup
            error={this.props.error}
            dismiss={this.dismissError}
          />
        }
      </React.Fragment>
    );
  }
}

Root.propTypes = {
  dismissError: PropTypes.func.isRequired,
  fetchUserIfNeeded: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
  const errorId = state.errors.allIds[0];
  const error = state.errors.byId[errorId];
  const user = state.users.byId[session.getUserId()];
  const isLoggedIn = session.isAuthenticated();

  return {
    error,
    user,
    isLoggedIn
  };
};

export default connect(
  mapStateToProps,
  { dismissError, fetchUserIfNeeded, logoutUser }
)(withRouter(Root));
