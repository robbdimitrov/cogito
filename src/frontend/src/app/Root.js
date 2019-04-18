import React from 'react';

import Navigation from '../common/navigation/Navigation';
import Overlay from '../common/Overlay';
import ThoughtBox from '../common/ThoughtBox';

class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isPopupShown: false};
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
      </React.Fragment>
    );
  }
}

export default Root;
