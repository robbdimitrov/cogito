import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class EditProfile extends React.Component {
  render() {
    return (
      <div className="form-content">
        <h1 className="form-title">Edit profile</h1>

        <form>
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
              pattern="[^@]+@[^@]+\.[^@]+"
              required
            />
          </div>

          <input
            type="submit"
            className="button form-button"
            value="Save changes"
          />
        </form>
      </div>
    );
  }
}

export default EditProfile;
