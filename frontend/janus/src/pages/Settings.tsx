import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
// import Box from '@mui/material/Box';
import useAuth from '../hooks/useAuth';
import { useColorScheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Address from '../components/Address';

export default function SettingsPage() {
  const { auth: session } = useAuth()
  const { mode, setMode } = useColorScheme()

  return (
    <Box sx={{ px: 5, mt: 4 }}>
      <Stack gap={4}>
        {/* General Section */}
        <Box>
          <Typography variant="h6">General</Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 1 }}>Username:</Typography>
            <Typography>{session?.user?.username}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 1 }}>Address: </Typography>
            <Address value={session?.user?.address || ''} size={32} shrink copy />
          </Box>
        </Box>

        {/* Preferences Section */}
        <Box>
          <Typography variant="h6">Preferences</Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 1 }}>Theme:</Typography>
            <Typography>{mode}</Typography>
          </Box>
        </Box>

        {/* Security Section */}
        <Box>
          <Typography variant="h6">Blockchain</Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 1 }}>Network:</Typography>
            <Typography>{import.meta.env.VITE_CARDANO_NETWORK}</Typography>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
