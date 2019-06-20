import React from 'react';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import session from '../Session';
import { createPost } from '../../store/actions/posts';

import './ThoughtBox.scss';

class ThoughtBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '', maxLength: 140 };
  }

  handleChange = (event) => {
    this.setState({ value: event.target.value });
  };

  isPostValid = () => {
    return this.state.value.length > 0 &&
      this.state.value.length <= this.state.maxLength;
  };

  couterClassName = () => {
    let className = 'thought-box-counter';
    if (this.state.value.length > this.state.maxLength) {
      className += ' invalid';
    }
    return className;
  };

  handleSubmit = (event) => {
    event.preventDefault();
    this.props.createPost(this.state.value);
    this.props.closePopup();
  };

  render() {
    return (
      <form className="thought-box" onSubmit={this.handleSubmit}>
        <div className="thought-box-header">
          <button className="close-button" onClick={this.props.closePopup}>
            <FontAwesomeIcon icon="times" />
          </button>

          <input
            type="submit"
            className="button submit-button"
            disabled={!this.isPostValid()}
            value="Create"
          />
        </div>

        <div className="thought-box-content">
          <img
            className="avatar"
            src={this.props.user.avatar}
            alt={this.props.user.name}
          />

          <textarea
            className="form-input"
            type="text"
            name="thought"
            placeholder="What are you thinking?"
            value={this.state.value}
            onChange={this.handleChange}
            required
          />
        </div>

        <span className={this.couterClassName()}>
          {this.state.value.length}/{this.state.maxLength}
        </span>
      </form>
    )
  }
}

ThoughtBox.propTypes = {
  user: PropTypes.object.isRequired,
  createPost: PropTypes.func.isRequired,
  closePopup: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
  user: state.users.byId[session.getUserId()]
});

export default connect(
  mapStateToProps,
  { createPost }
)(ThoughtBox);
