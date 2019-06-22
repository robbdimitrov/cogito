import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, NavLink } from 'react-router-dom';

import UserDropdown from './UserDropdown';
import session from '../Session';
import './Navigation.scss';

class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropdownShown: false
    };

    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.setState(state => ({
      isDropdownShown: !state.isDropdownShown
    }));
  }

  render() {
    return (
      <header className="navigation-container bottom-shadow">
        <div className="navigation-content main-container">
          {session.isAuthenticated() ? (
            <div className="left-items">
              <NavLink to="/feed" className="nav-button">
                <FontAwesomeIcon
                  icon="home"
                  className="nav-button-icon"
                  size="2x"
                />
                <span className="nav-button-label">Home</span>
              </NavLink>
            </div>
          ) : (
            <div className="left-items"></div>
          )}

          <FontAwesomeIcon icon="brain" className="icon" size="2x" />

          {session.isAuthenticated() ? (
            <div className="right-items">
              <div className="profile-button" onClick={this.handleClick}>
                <img
                  className="profile-button-image"
                  src="https://via.placeholder.com/300.png"
                  alt="Profile"
                />

                {this.state.isDropdownShown &&
                  <UserDropdown />
                }
              </div>

              <button
                className="button create-button"
                onClick={this.props.openPopup}
              >
                Create
              </button>
            </div>
          ) : (
            <div className="right-items">
              <Link to="/login" className="button login-button">
                Log In
              </Link>
            </div>
          )}
        </div>
      </header>
    );
  }
}

export default Navigation;
