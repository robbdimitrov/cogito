import React from 'react';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import { updatePassword } from '../store/actions/users';

class Password extends React.Component {
  handleSubmit = (event) => {
    event.preventDefault();
    this.props.updatePassword();
  };

  render() {
    return (
      <div className="form-content">
        <h1 className="form-title">Change password</h1>

        <form className="action-form" onSubmit={this.handleSubmit}>
          <div className="fieldset">
            <FontAwesomeIcon icon="lock" className="input-icon" />
            <input
              type="password" className="form-input"
              id="old-password" placeholder="New Password"
              minLength="4" maxLength="30" required
            />
            <button className="visibility-button">
              <FontAwesomeIcon icon="eye" />
            </button>
          </div>

          <div className="fieldset">
            <FontAwesomeIcon icon="lock" className="input-icon" />
            <input
              type="password" className="form-input"
              id="password" placeholder="Current Password"
              minLength="4" maxLength="30" required
            />
            <button className="visibility-button">
              <FontAwesomeIcon icon="eye" />
            </button>
          </div>

          <input
            type="submit"
            className="button form-button"
            value="Save"
          />
        </form>
      </div>
    );
  }
}

Password.propTypes = {
  updatePassword: PropTypes.func.isRequired
};

export default connect(
  null,
  { updatePassword }
)(Password);
