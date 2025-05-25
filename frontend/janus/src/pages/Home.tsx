import Typography from '@mui/material/Typography';
import useAuth from '../hooks/useAuth';
import { useEffect } from 'react';
import { getWalletBalance } from '../services/wallet.service';

export default function HomePage() {
    const { auth, setAuth } = useAuth()
    useEffect(() => {
        const fetch = async () => {
            try {
                const balance = await getWalletBalance(auth.user.id)
                console.log('Wallet Account Balance:', balance)
                setAuth({ user: auth.user, balance })
            } catch (err) {
                console.error(err)
            }
        }

        fetch()
    }, [])

  return <Typography>Welcome to Janus Wallet!</Typography>;
}
