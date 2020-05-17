import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// import { loginUser } from '../store/actions/auth';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: ''
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    const { email, password } = this.state;
    this.props.loginUser(email, password);
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
      <div className="container">
        <div className="form-content main-content">
          <h1 className="form-title">Log In</h1>
          <p className="form-message">Welcome back! Log in to access your account.</p>

          <form className="action-form" onSubmit={this.handleSubmit}>
            <div className="fieldset">
              <FontAwesomeIcon icon="envelope" className="input-icon" />
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="Email"
                pattern="[^@]+@[^@]+\.[^@]+"
                onChange={this.handleInputChange}
                value={this.state.email}
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="lock" className="input-icon" />
              <input
                className="form-input"
                type="password"
                name="password"
                placeholder="Password"
                minLength="4"
                maxLength="30"
                onChange={this.handleInputChange}
                value={this.state.password}
                required
              />
            </div>

            <input
              className="button form-button"
              type="submit"
              value="Log In"
            />
          </form>

          <div className="reference">
            <span className="reference-label">Don't have an accout?</span>
            <Link to="/signup" className="reference-button">
              <span>Sign Up</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
