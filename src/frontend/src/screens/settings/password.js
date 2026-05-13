import React, {useState, useEffect} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

function Password(props) {
  const [state, setState] = useState({
    password: '',
    oldPassword: '',
    passwordVisible: false,
    oldPasswordVisible: false,
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

    const {password, oldPassword} = state;
    props.updatePassword(password, oldPassword);
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

  function changeInputType(field) {
    setState({
      ...state,
      [field]: !state[field]
    });
  }

  return (
    <div className='form-content'>
      <h1 className='form-title'>Change Password</h1>

      {props.error && <p className="form-error">{props.error}</p>}

      <form className='action-form' onSubmit={handleSubmit}>
        <div className='fieldset'>
          <FontAwesomeIcon icon='lock' className='input-icon' />
          <input
            className='form-input'
            type={state.passwordVisible ? 'text' : 'password'}
            name='password'
            placeholder='New Password'
            minLength='4'
            maxLength='30'
            onChange={handleInputChange}
            value={state.password}
            required
          />
          <button
            className='visibility-button'
            onClick={() => changeInputType('passwordVisible')}
            type='button'
          >
            <FontAwesomeIcon icon='eye' />
          </button>
        </div>

        {state.password && state.password.length < 4 && (
          <p className="form-error">Password must be at least 4 characters.</p>
        )}

        <div className='fieldset'>
          <FontAwesomeIcon icon='lock' className='input-icon' />
          <input
            className='form-input'
            type={state.oldPasswordVisible ? 'text' : 'password'}
            name='oldPassword'
            placeholder='Current Password'
            minLength='4'
            maxLength='30'
            onChange={handleInputChange}
            value={state.oldPassword}
            required
          />
          <button
            className='visibility-button'
            onClick={() => changeInputType('oldPasswordVisible')}
            type='button'
          >
            <FontAwesomeIcon icon='eye' />
          </button>
        </div>

        {state.oldPassword && state.oldPassword.length < 4 && (
          <p className="form-error">Current password must be at least 4 characters.</p>
        )}

        <input
          type='submit'
          className='button form-button'
          value='Save'
          disabled={isSubmitting}
        />
      </form>
    </div>
  );
}

export default Password;
