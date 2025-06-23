import { ThemeProvider, createTheme } from '@mui/material';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { type Navigation } from '@toolpad/core/AppProvider';
import { Outlet } from 'react-router';
import { AuthProvider } from './context/AuthProvider';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import SendIcon from '@mui/icons-material/Send';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import BallotIcon from '@mui/icons-material/Ballot';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: '',
    title: 'Home',
    icon: <DashboardIcon />,
  },
  {
    segment: 'earning',
    title: 'Earning',
    icon: <StackedBarChartIcon />,
  },
  {
    segment: 'receive',
    title: 'Receive',
    icon: <SouthWestIcon />,
  },
  {
    segment: 'send',
    title: 'Send',
    icon: <SendIcon />,
  },
  {
    kind: 'divider',
  },
  {
    kind: 'header',
    title: 'Analytics',
  },
  {
    segment: 'governance',
    title: 'Governance',
    icon: <HowToVoteIcon />,
    children: [
      {
        segment: 'dreps',
        title: 'Dreps',
        icon: <BallotIcon />,
      }
    ],
  },
  {
    segment: 'activity',
    title: 'Activity',
    icon: <ImportExportIcon />,
  },
];

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <ReactRouterAppProvider 
          navigation={NAVIGATION} 
          theme={theme}
          branding={{
            // TODO: add logo
            // logo: <img src="https://mui.com/static/logo.png" alt="MUI logo" />,
            title: 'Janus',
            homeUrl: '',
          }}
        >
          <Outlet />
        </ReactRouterAppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
