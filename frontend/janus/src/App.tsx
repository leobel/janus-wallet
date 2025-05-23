import { ThemeProvider, createTheme } from '@mui/material';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { type Navigation } from '@toolpad/core/AppProvider';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import LayersIcon from '@mui/icons-material/Layers';
import { Outlet } from 'react-router';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: '',
    title: 'Portfolio',
    icon: <DashboardIcon />,
  },
  {
    segment: 'staking',
    title: 'Staking',
    icon: <ShoppingCartIcon />,
  },
  {
    segment: 'receive',
    title: 'Receive',
    icon: <ShoppingCartIcon />,
  },
  {
    segment: 'send',
    title: 'Send',
    icon: <ShoppingCartIcon />,
  },
  {
    kind: 'divider',
  },
  {
    kind: 'header',
    title: 'Analytics',
  },
  {
    segment: 'reports',
    title: 'Reports',
    icon: <BarChartIcon />,
    children: [
      {
        segment: 'sales',
        title: 'Sales',
        icon: <DescriptionIcon />,
      },
      {
        segment: 'traffic',
        title: 'Traffic',
        icon: <DescriptionIcon />,
      },
    ],
  },
  {
    segment: 'integrations',
    title: 'Integrations',
    icon: <LayersIcon />,
  },
];

const theme = createTheme({
  palette: {
    primary: {
      main: '#1E88E5',
    },
    secondary: {
      main: '#26A69A',
    },
  },
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
    </ThemeProvider>
  );
}

export default App;
