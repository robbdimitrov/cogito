import React from 'react';
import {Link} from 'react-router-dom';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

function Login(props) {
  const [state, setState] = useState({
    email: '',
    password: '',
  });

  function handleSubmit(event) {
    event.preventDefault();
    const {email, password} = state;
    props.loginUser(email, password);
  }

  function handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    setState({
      ...state,
      [name]: value
    });
  }

  return (
    <div className='container'>
      <div className='form-content main-content'>
        <h1 className='form-title'>Log In</h1>
        <p className='form-message'>Welcome back! Log in to access your account.</p>

        <form className='action-form' onSubmit={handleSubmit}>
          <div className='fieldset'>
            <FontAwesomeIcon icon='envelope' className='input-icon' />
            <input
              className='form-input'
              type='email'
              name='email'
              placeholder='Email'
              pattern='[^@]+@[^@]+\.[^@]+'
              onChange={handleInputChange}
              value={state.email}
              required
            />
          </div>

          <div className='fieldset'>
            <FontAwesomeIcon icon='lock' className='input-icon' />
            <input
              className='form-input'
              type='password'
              name='password'
              placeholder='Password'
              minLength='4'
              maxLength='30'
              onChange={handleInputChange}
              value={state.password}
              required
            />
          </div>

          <input
            className='button form-button'
            type='submit'
            value='Log In'
          />
        </form>

        <div className='reference'>
          <span className='reference-label'>Don't have an accout?</span>
          <Link to='/signup' className='reference-button'>
            <span>Sign Up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
