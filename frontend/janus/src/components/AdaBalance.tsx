import { Typography, Box } from "@mui/material"

export interface AdaBalanceProps {
    balance?: string
    privacy: boolean
}

function formatAdaBalance(balance: string): { whole: string, decimal: string } {
    const num = parseFloat(balance)
    if (isNaN(num)) return { whole: balance, decimal: '' }

    // Convert from lovelace to ADA (divide by 1,000,000)
    const adaAmount = num / 1_000_000

    // Split into whole and decimal parts
    const [whole, decimal] = adaAmount.toFixed(6).split('.')
    
    // Format whole number with commas
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    // Only include decimal part if it's not all zeros
    const formattedDecimal = decimal && decimal !== '000000' 
        ? decimal.replace(/0+$/, '') 
        : ''
    
    return {
        whole: formattedWhole,
        decimal: formattedDecimal ? `.${formattedDecimal}` : ''
    }
}

export default function AdaBalance(props: AdaBalanceProps) {
    const { whole, decimal } = formatAdaBalance(props.balance || '0')
    
    return (
        <Typography sx={{
            filter: props.privacy ? 'blur(4px)' : 'none',
            transition: 'filter 0.2s ease-in-out',
            display: 'flex',
            alignItems: 'baseline'
        }}>
            <Box component="span" sx={{ fontWeight: 700 }}>{whole}</Box>
            <Box component="span" sx={{ 
                fontSize: '0.85em',
                opacity: 0.8,
            }}>{decimal}</Box>
            <Box component="span" sx={{ 
                fontSize: '0.85em',
                opacity: 0.8,
                ml: 0.5 
            }}>ADA</Box>
        </Typography>
    )
}