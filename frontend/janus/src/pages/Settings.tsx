import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
// import Box from '@mui/material/Box';
import useAuth from '../hooks/useAuth';
import { useColorScheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Address from '../components/Address';
import { Button, List, ListItem, ListItemText } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router';

export default function SettingsPage() {
  const { auth: session } = useAuth()
  const { mode, setMode } = useColorScheme()
  const navigate = useNavigate()

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

        {/* Change Password */}
        <Box>
          <Typography variant="h6">Danger Zone</Typography>
          <Box
            sx={{
              border: 1,
              borderRadius: 2,
              borderColor: 'error.main',
              p: 2,
              mt: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ pr: 2 }}>
                <Typography variant="body1">
                  Change your password
                </Typography>
                <Stack>
                  <Typography variant="body2">
                    You're about to update your password. This process will:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Prompt signing one or more transaction(s) to re-initialize your wallet.">
                      </ListItemText>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Result in a new wallet address being generated, your current address will no longer receive future funds.">
                      </ListItemText>
                    </ListItem>
                  </List>
                  <Stack>
                    <Typography sx={{ fontWeight: 600 }}>
                      <WarningIcon color='warning'/> Please note:
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      By proceeding, you're authorizing on-chain changes. 
                      Ensure any scheduled or incoming transfers with your current wallet address are completed before continuing.</Typography>
                  </Stack>
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', minWidth: 'fit-content' }}>
                <Button variant='outlined' color='error' onClick={() => navigate('/change-pwd')}>Change password</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
