import React from 'react';
import { connect } from 'react-redux';

import Navigation from '../common/components/navigation/Navigation';
import Overlay from '../common/components/overlay/Overlay';
import ThoughtBox from '../common/components/thoughtbox/ThoughtBox';
import ErrorPopup from '../common/components/errorpopup/ErrorPopup';
import { dismissError } from '../store/actions/errors';

class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isPopupShown: false };
  }

  openPopup = () => {
    this.setState(state => ({
      isPopupShown: true
    }));
  };

  closePopup = () => {
    this.setState(state => ({
      isPopupShown: false
    }));
  };

  render() {
    return (
      <React.Fragment>
        {this.state.isPopupShown &&
          <Overlay>
            <ThoughtBox
              closePopup={this.closePopup}
            />
          </Overlay>
        }

        <Navigation openPopup={this.openPopup} />

        {this.props.error &&
          <ErrorPopup
            error={this.props.error}
            dismiss={() => this.props.dismissError(this.props.error.id)}
          />
        }
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const errorId = state.errors.allIds[0];
  const error = state.errors.byId[errorId];

  return {
    error
  };
};

export default connect(
  mapStateToProps,
  { dismissError }
)(Root);
