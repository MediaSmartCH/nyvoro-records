import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createNyvoroRouter } from './router';
import { applyTheme, getInitialResolvedTheme } from './lib/theme';
import './styles.css';

const router = createNyvoroRouter();
applyTheme(getInitialResolvedTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </React.StrictMode>
);
