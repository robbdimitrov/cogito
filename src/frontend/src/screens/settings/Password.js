import React, {useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

function Password(props) {
  const [state, setState] = useState({
    password: '',
    oldPassword: '',
  });

  function handleSubmit(event) {
    event.preventDefault();

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

  return (
    <div className='form-content'>
      <h1 className='form-title'>Change Password</h1>

      <form className='action-form' onSubmit={handleSubmit}>
        <div className='fieldset'>
          <FontAwesomeIcon icon='lock' className='input-icon' />
          <input
            className='form-input'
            type='password'
            name='password'
            placeholder='New Password'
            minLength='4'
            maxLength='30'
            onChange={handleInputChange}
            value={state.password}
            required
          />
          <button className='visibility-button'>
            <FontAwesomeIcon icon='eye' />
          </button>
        </div>

        <div className='fieldset'>
          <FontAwesomeIcon icon='lock' className='input-icon' />
          <input
            className='form-input'
            type='password'
            name='oldPassword'
            placeholder='Current Password'
            minLength='4'
            maxLength='30'
            onChange={handleInputChange}
            value={state.oldPassword}
            required
          />
          <button className='visibility-button'>
            <FontAwesomeIcon icon='eye' />
          </button>
        </div>

        <input
          type='submit'
          className='button form-button'
          value='Save'
        />
      </form>
    </div>
  );
}

export default Password;
