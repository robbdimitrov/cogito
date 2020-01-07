import React from 'react';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import session from '../../services/Session';
import { createPost } from '../../../store/actions/posts';

import './ThoughtBox.scss';

class ThoughtBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      maxLength: 140
    };

    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    this.props.createPost(this.state.value);
    this.props.closePopup();
  };

  handleInputChange(event) {
    this.setState({
      value: event.target.value
    });
  }

  isPostValid() {
    return this.state.value.length > 0 &&
      this.state.value.length <= this.state.maxLength;
  }

  counterValue() {
    const { value, maxLength } = this.state;
    return `${value.length}/${maxLength}`;
  }

  couterClassName() {
    let className = 'thought-box-counter';
    if (this.state.value.length > this.state.maxLength) {
      className += ' invalid';
    }
    return className;
  }

  render() {
    return (
      <form className="thought-box" onSubmit={this.handleSubmit}>
        <div className="thought-box-header">
          <button className="close-button" onClick={this.props.closePopup}>
            <FontAwesomeIcon icon="times" />
          </button>

          <input
            className="button submit-button"
            type="submit"
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
            onChange={this.handleInputChange}
            value={this.state.value}
            required
          />
        </div>

        <span className={this.couterClassName()}>
          {this.counterValue()}
        </span>
      </form>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.users.byId[session.getUserId()]
  };
};

export default connect(
  mapStateToProps,
  { createPost }
)(ThoughtBox);
