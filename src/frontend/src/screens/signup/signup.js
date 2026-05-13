import React, {useState, useEffect} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Link from '../../shared/router/link';

function Signup(props) {
  const [state, setState] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    inputType: 'password',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.error) {
      setIsSubmitting(false);
    }
  }, [props.error]);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const {name, username, email, password} = state;
    props.registerUser(name, username, email, password);
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

  function changeInputType(event) {
    const isHidden = state.inputType === 'password';
    setState({
      ...state,
      inputType: isHidden ? 'text' : 'password'
    });
  }

  return (
    <div className='container'>
      <div className='form-content main-content'>
        <h1 className='form-title'>Sign Up</h1>
        <p className='form-message'>Create an account and join in!</p>

        {props.error && <p className="form-error">{props.error}</p>}

        <form className='action-form' onSubmit={handleSubmit}>
          <div className='fieldset'>
            <FontAwesomeIcon icon='passport' className='input-icon' />
            <input
              className='form-input'
              type='text'
              name='name'
              placeholder='Name'
              onChange={handleInputChange}
              required
            />
          </div>

          <div className='fieldset'>
            <FontAwesomeIcon icon='user' className='input-icon' />
            <input
              className='form-input'
              type='text'
              name='username'
              placeholder='Username'
              onChange={handleInputChange}
              required
            />
          </div>

          {state.username && !/^[a-zA-Z0-9_]+$/.test(state.username) && (
            <p className="form-error">Username must contain only letters, numbers, and underscores.</p>
          )}

          <div className='fieldset'>
            <FontAwesomeIcon icon='envelope' className='input-icon' />
            <input
              className='form-input'
              type='email'
              name='email'
              placeholder='Email'
              pattern='[^@]+@[^@]+\.[^@]+'
              onChange={handleInputChange}
              required
            />
          </div>

          <div className='fieldset'>
            <FontAwesomeIcon icon='lock' className='input-icon' />
            <input
              className='form-input'
              type={state.inputType}
              name='password'
              placeholder='Password'
              minLength='4'
              maxLength='30'
              onChange={handleInputChange}
              required
            />
            <button
              className='visibility-button'
              onClick={changeInputType}
              type='button'
            >
              <FontAwesomeIcon icon='eye' />
            </button>
          </div>

          {state.password && state.password.length < 4 && (
            <p className="form-error">Password must be at least 4 characters.</p>
          )}

          <input
            className='button form-button'
            type='submit'
            value='Create Account'
            disabled={isSubmitting}
          />
        </form>

        <div className='reference'>
          <span className='reference-label'>Already have an account?</span>

          <Link href='/login' className='reference-button'>
            <span>Log In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
