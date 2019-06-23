import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

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
  }

  componentWillMount() {
    const userId = session.getUserId();
    this.props.fetchUserIfNeeded(userId);
  }

  openPopup() {
    this.setState(state => ({
      isPopupShown: true
    }));
  }

  closePopup() {
    this.setState(state => ({
      isPopupShown: false
    }));
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
          logoutUser={this.props.logoutUser}
        />

        {this.props.error &&
          <ErrorPopup
            error={this.props.error}
            dismiss={() => this.props.dismissError(this.props.error.id)}
          />
        }
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const errorId = state.errors.allIds[0];
  const error = state.errors.byId[errorId];
  const user = state.users.byId[session.getUserId()];

  return {
    error,
    user
  };
};

Root.propTypes = {
  dismissError: PropTypes.func.isRequired,
  fetchUserIfNeeded: PropTypes.func.isRequired
};

export default connect(
  mapStateToProps,
  { dismissError, fetchUserIfNeeded, logoutUser }
)(Root);
