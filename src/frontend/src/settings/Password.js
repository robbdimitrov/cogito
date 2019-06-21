import React from 'react';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import { updatePassword } from '../store/actions/users';

class Password extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      oldPassword: ''
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();

    const { password, oldPassword } = this.state;
    this.props.updatePassword(password, oldPassword);
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  render() {
    return (
      <div className="form-content">
        <h1 className="form-title">Change Password</h1>

        <form className="action-form" onSubmit={this.handleSubmit}>
          <div className="fieldset">
            <FontAwesomeIcon icon="lock" className="input-icon" />
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="New Password"
              minLength="4"
              maxLength="30"
              onChange={this.handleInputChange}
              value={this.state.password}
              required
            />
            <button className="visibility-button">
              <FontAwesomeIcon icon="eye" />
            </button>
          </div>

          <div className="fieldset">
            <FontAwesomeIcon icon="lock" className="input-icon" />
            <input
              className="form-input"
              type="password"
              name="oldPassword"
              placeholder="Current Password"
              minLength="4"
              maxLength="30"
              onChange={this.handleInputChange}
              value={this.state.oldPassword}
              required
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
