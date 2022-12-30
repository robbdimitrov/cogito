import React from 'react';

import Navbar from './shared/components/navbar/Navbar';
import IconLibrary from './shared/services/IconLibrary';

import {createBrowserRouter, RouterProvider} from "react-router-dom";

IconLibrary.configure();

const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello world!</div>,
  },
]);

class App extends React.Component {
  render() {
    return (
      <div className="app">
        <Navbar />
        <RouterProvider router={router} />
      </div>
    );
  }
}

export default App;
