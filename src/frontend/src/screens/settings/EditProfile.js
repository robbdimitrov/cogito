import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './EditProfile.scss';

class EditProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      username: '',
      email: '',
      bio: '',
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleImageChange = this.handleImageChange.bind(this);
  }

  componentDidMount() {
    const { name, username, email, bio } = this.props.user;

    this.setState({
      name,
      username,
      email,
      bio,
    });
  }

  handleSubmit(event) {
    event.preventDefault();

    const { name, username, email, bio } = this.state;
    this.props.updateUser(name, username, email, bio);
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
      <div className='form-content'>
        <h1 className='form-title'>Edit Profile</h1>

        <form className='action-form' onSubmit={this.handleSubmit}>
          <div className='fieldset'>
            <FontAwesomeIcon icon='passport' className='input-icon' />
            <input
              className='form-input'
              type='text'
              name='name'
              placeholder='Name'
              onChange={this.handleInputChange}
              value={this.state.name}
            />
          </div>

          <div className='fieldset'>
            <FontAwesomeIcon icon='user' className='input-icon' />
            <input
              className='form-input'
              type='text'
              name='username'
              placeholder='Username'
              onChange={this.handleInputChange}
              value={this.state.username}
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
              onChange={this.handleInputChange}
              value={this.state.email}
              required
            />
          </div>

          <div className='fieldset long'>
            <FontAwesomeIcon icon='file-alt' className='input-icon' />
            <textarea
              className='form-input'
              type='text'
              name='bio'
              placeholder='Add your bio'
              onChange={this.handleInputChange}
              value={this.state.bio}
            />
          </div>

          <input
            type='submit'
            className='button form-button'
            value='Save changes'
          />
        </form>
      </div>
    );
  }
}

export default EditProfile;
