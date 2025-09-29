import { Tooltip, Chip, Typography, Stack, Box, IconButton } from "@mui/material";
import CloudCircleIcon from '@mui/icons-material/CloudCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useEffect, useState, useRef } from "react";
import useAuth from "../hooks/useAuth";
import AdaBalance from "./AdaBalance";

export function AppTitle() {
    const { balance, lastBalanceTime, refreshBalance } = useAuth()
    const [privacy, setPrivacy] = useState(false)
    const [refreshingBalance, setRefreshingBalance] = useState(false)
    const prevLastBalanceTimeRef = useRef<number | null>(null)

    const togglePrivacy = () => {
        setPrivacy(prev => !prev)
    }

    const handleRefreshBalance = () => {
        setRefreshingBalance(true)
        refreshBalance()
    }

    useEffect(() => {
        if (refreshingBalance && lastBalanceTime !== prevLastBalanceTimeRef.current) {
            setRefreshingBalance(false)
        }

        if (lastBalanceTime !== prevLastBalanceTimeRef.current) {
            prevLastBalanceTimeRef.current = lastBalanceTime
        }
    }, [lastBalanceTime, refreshingBalance])

    return (
        <Stack direction="row" alignItems="center" spacing={2}>
            <CloudCircleIcon fontSize="large" color="primary" />
            <Typography variant="h6">Janus</Typography>
            <Chip size="small" label="BETA" color="info" />
            <Box>
                {refreshingBalance && <Typography>Refreshing ...</Typography>}
                {!refreshingBalance && <AdaBalance
                    balance={balance?.lovelace}
                    privacy={privacy}
                />}
            </Box>
            <Tooltip title={privacy ? "Show balance" : "Hide balance"}>
                <IconButton onClick={togglePrivacy}>
                    {privacy
                        ? <VisibilityOffIcon fontSize="small" />
                        : <VisibilityIcon fontSize="small" />
                    }
                </IconButton>
            </Tooltip>
            <IconButton onClick={handleRefreshBalance} disabled={refreshingBalance}>
                <RefreshIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}