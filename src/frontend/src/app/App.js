import React from 'react';

import Navbar from './shared/components/navbar/Navbar';
import IconLibrary from './shared/services/IconLibrary';

IconLibrary.configure();

class App extends React.Component {
  render() {
    return (
      <div class="container">
        <Navbar />
      </div>
    );
  }
}

export default App;
