import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      username: '',
      email: '',
      password: '',
      inputType: 'password'
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.changeInputType = this.changeInputType.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();

    const { name, username, email, password } = this.state;
    this.props.registerUser(name, username, email, password);
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  changeInputType(event) {
    const isHidden = this.state.inputType === 'password';
    this.setState({
      inputType: isHidden ? 'text' : 'password'
    });
  }

  render() {
    return (
      <div className="container">
        <div className="form-content main-content">
          <h1 className="form-title">Sign Up</h1>
          <p className="form-message">Create an account and join in!</p>

          <form className="action-form" onSubmit={this.handleSubmit}>
            <div className="fieldset">
              <FontAwesomeIcon icon="passport" className="input-icon" />
              <input
                className="form-input"
                type="text"
                name="name"
                placeholder="Name"
                onChange={this.handleInputChange}
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="user" className="input-icon" />
              <input
                className="form-input"
                type="text"
                name="username"
                placeholder="Username"
                onChange={this.handleInputChange}
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="envelope" className="input-icon" />
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="Email"
                pattern="[^@]+@[^@]+\.[^@]+"
                onChange={this.handleInputChange}
                required
              />
            </div>

            <div className="fieldset">
              <FontAwesomeIcon icon="lock" className="input-icon" />
              <input
                className="form-input"
                type={this.state.inputType}
                name="password"
                placeholder="Password"
                minLength="4"
                maxLength="30"
                onChange={this.handleInputChange}
                required
              />
              <button
                className="visibility-button"
                onClick={this.changeInputType}
                type="button"
              >
                <FontAwesomeIcon icon="eye" />
              </button>
            </div>

            <input
              className="button form-button"
              type="submit"
              value="Create Account"
            />
          </form>

          <div className="reference">
            <span className="reference-label">Already have an accout?</span>

            <Link to="/login" className="reference-button">
              <span>Log In</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Signup;
