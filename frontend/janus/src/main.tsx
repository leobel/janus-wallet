import React from 'react'
import ReactDOM from 'react-dom/client'
import { StyledEngineProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router';
import Dashboard from './layouts/Dashboard';
import HomePage from './pages/Home';
import Earning from './pages/Earning.tsx';
import ReceivePage from './pages/Receive';
import SendPage from './pages/Send';
import ActivityPage from './pages/Activity';
import SignIn from './pages/SignIn.tsx';
import isAuthenticated from './guards/auth'

import App from './App.tsx'
import './index.css'
import setupAxiosInterceptors from './api/interceptor.tsx';
import SignUp from './pages/SignUp.tsx';
import { DrepPage } from './pages/Drep.tsx';

const router = createBrowserRouter([
  {
    Component: App, // root layout route
    children: [
      {
        path: '/',
        loader: async ({ request }) => {
          console.log("Loader...", request)
          const isAuth = await isAuthenticated(request)
          if (!isAuth) {
            return redirect("/login")
          }
        },
        Component: Dashboard,
        children: [
          {
            path: '',
            Component: HomePage
          },
          {
            path: 'earning',
            Component: Earning
          },
          {
            path: 'receive',
            Component: ReceivePage
          },
          {
            path: 'send',
            Component: SendPage
          },
          {
            path: 'governance',
            children: [
              {
                  path: 'dreps',
                  Component: DrepPage
              }
            ]
          },
          {
            path: 'activity',
            Component: ActivityPage
          },
        ],
      },
      {
        path: '/login',
        Component: SignIn,
      },
      {
        path: '/signup',
        Component: SignUp
      }
    ],
  },
]);

setupAxiosInterceptors(router)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      {/* <App /> */}
      <RouterProvider router={router} />
    </StyledEngineProvider>
  </React.StrictMode>,
)
