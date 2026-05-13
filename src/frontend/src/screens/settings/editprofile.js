import React, {useState, useEffect} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

function EditProfile(props) {
  const [state, setState] = useState({
    name: props.user.name,
    username: props.user.username,
    email: props.user.email,
    bio: props.user.bio,
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
    const {name, username, email, bio} = state;
    props.updateUser(name, username, email, bio);
  }

  function  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;
    setState({...state, [name]: value});
  }

  return (
    <div className='form-content'>
      <h1 className='form-title'>Edit Profile</h1>

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
            value={state.name}
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
            value={state.username}
            required
          />
        </div>

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

        <div className='fieldset long'>
          <FontAwesomeIcon icon='file-alt' className='input-icon' />
          <textarea
            className='form-input'
            name='bio'
            placeholder='Add your bio'
            onChange={handleInputChange}
            value={state.bio}
          />
        </div>

        <input
          type='submit'
          className='button form-button'
          value='Save changes'
          disabled={isSubmitting}
        />
      </form>
    </div>
  );
}

export default EditProfile;
