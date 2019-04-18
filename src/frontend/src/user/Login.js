import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class Login extends React.Component {
  render() {
    return (
      <div className='container'>
        <div className='form-content main-content'>
          <h1 className='form-title'>Login</h1>
          <p className='form-message'>Welcome back! Login to access your account.</p>

          <form className='action-form'>
            <div className='fieldset'>
              <FontAwesomeIcon icon='envelope' className='input-icon' />
              <input
                type='email' className='form-input'
                id='email' placeholder='Email'
                pattern='[^@]+@[^@]+\.[^@]+' required
              />
            </div>

            <div className='fieldset'>
              <FontAwesomeIcon icon='lock' className='input-icon' />
              <input
                type='password' className='form-input'
                id='password' placeholder='Password'
                minLength='4' maxLength='30' required
              />
            </div>

            <input
              type='submit'
              className='button form-button'
              value='Log In'
            />
          </form>

          <div className='reference'>
            <span className='reference-label'>Don't have an accout?</span>
            <Link to='/signup' className='reference-button'>
              <span>Register</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
