import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { registerUser } from '../store/actions/users';

class Signup extends React.Component {
  handleSignup = (event) => {
    event.preventDefault();
    this.props.registerUser();
  };

  render() {
    return (
      <div className="container">
        <div className="form-content main-content">
          <h1 className="form-title">Register</h1>
          <p className="form-message">Create an account and join in!</p>

          <form className="action-form" onSubmit={this.handleSignup}>
            <div className="fieldset">
              <FontAwesomeIcon icon="passport" className="input-icon" />
              <input
                type="text" className="form-input"
                id="name" placeholder="Name"
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="user" className="input-icon" />
              <input
                type="text" className="form-input"
                id="username" placeholder="Username"
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="envelope" className="input-icon" />
              <input
                type="email" className="form-input"
                id="email" placeholder="Email"
                pattern="[^@]+@[^@]+\.[^@]+" required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="lock" className="input-icon" />
              <input
                type="password" className="form-input"
                id="password" placeholder="Password"
                minLength="4" maxLength="30" required
              />
              <button className="visibility-button">
                <FontAwesomeIcon icon="eye" />
              </button>
            </div>

            <input
              type="submit"
              className="button form-button"
              value="Register"
            />
          </form>

          <div className="reference">
            <span className="reference-label">Already have an accout?</span>

            <Link to="/login" className="reference-button">
              <span>Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  null,
  { registerUser }
)(Signup);
