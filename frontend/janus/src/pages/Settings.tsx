import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import useAuth from '../hooks/useAuth';
import { useColorScheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';

export default function SettingsPage() {
  const { auth: session, balance } = useAuth()
  const { mode, setMode } = useColorScheme()

  return (
    <Box sx={{ px: 5, mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Stack gap={4}>
        {/* Account Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Account</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography>Username: {session?.user?.username}</Typography>
          <Typography>Address: {session?.user?.address}</Typography>
          <Typography>Balance: {balance?.lovelace}</Typography>
          {/* Add more account info as needed */}
        </Paper>

        {/* Preferences Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Preferences</Typography>
          <Divider sx={{ my: 1 }} />
          {/* Example: */}
          <Typography>Theme: {mode}</Typography>
          {/* Add more preferences */}
        </Paper>

        {/* Security Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Network</Typography>
          <Divider sx={{ my: 1 }} />
          {/* Example: */}
          <Typography>Password: ••••••••</Typography>
          {/* Add security settings/actions */}
        </Paper>
      </Stack>
    </Box>
  );
}
