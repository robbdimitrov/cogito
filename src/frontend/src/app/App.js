import React from 'react';

import Root from './Root';
import AppRouter from './AppRouter';
import IconLibrary from '../common/services/IconLibrary';

IconLibrary.configure();

class App extends React.Component {
  render() {
    return (
      <AppRouter>
        <Root />
      </AppRouter>
    );
  }
}

export default App;
