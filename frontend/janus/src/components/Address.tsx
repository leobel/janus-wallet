import { Stack, Typography, IconButton, Tooltip } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

export interface AddressProps {
    value: string
    size?: number
    shrink?: boolean
    copy?: boolean
    explore?: boolean
    path?: string
}

export default function Address(props: AddressProps) {
    const address = props.value
    const size = props.size || 10
    const path = props.path ?? 'address'

    const displayAddress = props.shrink && address.length > size
        ? `${address.slice(0, size)}...${address.slice(-size)}`
        : address

    function handleCopy() {
        navigator.clipboard.writeText(props.value)
    }

    function handleOpen() {
        const url = `${import.meta.env.VITE_CARDANO_EXPLORER}${path}/${address}`
        window.open(url, '_blank', "noopener noreferrer")
    }

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Typography>{displayAddress}</Typography>
            {props.copy && (
                <Tooltip title="Copy to clipboard">
                    <IconButton size="small" onClick={handleCopy}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
            {props.explore && <Tooltip title="View onchain">
                <IconButton size="small" onClick={handleOpen} >
                    <OpenInNewIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            }
        </Stack>
    )
}