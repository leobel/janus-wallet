import Typography from '@mui/material/Typography';
import useAuth from '../hooks/useAuth';
import { Box, Paper } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import Address from '../components/Address';

export default function ReceivePage() {
  const { auth: session } = useAuth()
  return (
    <Box sx={{paddingX: 5, paddingY: 2}}>
      <Typography variant="h5">Your wallet address</Typography>
      <Typography fontSize="small">Scan QR code or copy address</Typography>

        <Box display="flex" justifyContent="flex-start" sx={{paddingTop: 2}}>
          {session.user &&
            <>
              <QRCodeSVG
                size={200}
                marginSize={3}
                level='M'
                value={session.user.address} />
              <Box sx={{ ml: 2 }}>
                <Address
                  shrink
                  size={45}
                  copy
                  explore
                  value={session.user?.address}
                />
              </Box>
            </>
          }
        </Box>
    </Box>
  );
}
