import React from 'react'
import ReactDOM from 'react-dom/client'
import { StyledEngineProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import { createBrowserRouter, RouterProvider } from 'react-router';
import Dashboard from './layouts/Dashboard';
import HomePage from './pages/Home';
import StakingPage from './pages/Staking';
import ReceivePage from './pages/Receive';
import SendPage from './pages/Send';

import App from './App.tsx'
import './index.css'

const router = createBrowserRouter([
  {
    Component: App, // root layout route
    children: [
      {
        path: '/',
        Component: Dashboard,
        children: [
          {
            path: '',
            Component: HomePage
          },
          {
            path: 'staking',
            Component: StakingPage
          },
          {
            path: 'receive',
            Component: ReceivePage
          },
          {
            path: 'send',
            Component: SendPage
          },
        ]
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      {/* <App /> */}
      <RouterProvider router={router} />
    </StyledEngineProvider>
  </React.StrictMode>,
)
