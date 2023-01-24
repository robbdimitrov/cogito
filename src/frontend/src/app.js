import React from 'react';

import Navbar from './shared/components/navbar/navbar';
import IconLibrary from './shared/services/iconlibrary';

import {createBrowserRouter, RouterProvider} from "react-router-dom";

IconLibrary.configure();

const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello world!</div>,
  },
]);

function App() {
  return (
    <div className="app">
      <Navbar />
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
