import { Tooltip, Chip, Typography, Stack, Box, IconButton } from "@mui/material";
import CloudCircleIcon from '@mui/icons-material/CloudCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useState } from "react";
import useAuth from "../hooks/useAuth";
import AdaBalance from "./AdaBalance";

export function AppTitle() {
    const { balance } = useAuth()
    const [privacy, setPrivacy] = useState(false)

    const togglePrivacy = () => {
        setPrivacy(prev => !prev)
    }

    return (
        <Stack direction="row" alignItems="center" spacing={2}>
            <CloudCircleIcon fontSize="large" color="primary" />
            <Typography variant="h6">Janus</Typography>
            <Chip size="small" label="BETA" color="info" />
            <Box>
                <AdaBalance
                    balance={balance?.lovelace}
                    privacy={privacy}
                />
            </Box>
            <Tooltip title={privacy ? "Show balance" : "Hide balance"}>
            <IconButton  onClick={togglePrivacy}>
                {privacy
                    ? <VisibilityOffIcon fontSize="small" />
                    : <VisibilityIcon fontSize="small" />
                }
                </IconButton>
            </Tooltip>
        </Stack>
    );
}