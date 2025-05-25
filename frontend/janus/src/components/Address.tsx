import { Stack, Typography, IconButton, Tooltip } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

export interface AddressProps {
    address: string
    shrink?: boolean
    copy?: boolean
}

export default function Address(props: AddressProps) {
    const { address, shrink, copy } = props

    const displayAddress = shrink 
        ? `${address.slice(0, 10)}...${address.slice(-10)}`
        : address

    const handleCopy = () => {
        navigator.clipboard.writeText(address)
    }

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Typography>{displayAddress}</Typography>
            {copy && (
                <Tooltip title="Copy to clipboard">
                    <IconButton size="small" onClick={handleCopy}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    )
}