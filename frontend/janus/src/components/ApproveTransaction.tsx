import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, TextField } from "@mui/material"
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useState } from "react"
import { generateRedeemer } from "../utils/hashing"

// Define TxType as a union of string or string[]
export type TxType = string | string[]

// Encapsulate the conditional logic for redeemers type
export type RedeemersType<T extends TxType> = T extends string ? string[] : string[][]

export interface ApproveTransactionProps<T extends TxType> {
    open: boolean
    username: string
    hash: string
    tx: T
    approveText?: string
    onApprove(redeemers: RedeemersType<T>): void
    onCancel(): void
}

export function ApproveTransaction<T extends TxType>(props: ApproveTransactionProps<T>) {
    const [showPassword, setShowPassword] = useState(false)
    const [errMsg, setErrMsg] = useState('')

    const handleClickShowPassword = () => setShowPassword((show) => !show)

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    async function buildRedeemers(pwd: string) {
        try {
            if (Array.isArray(props.tx)) {
                // Handle multiple transactions
                const redeemersArray = await Promise.all(
                    props.tx.map(tx => generateRedeemer(props.username, props.hash, pwd, tx))
                )
                console.log('Redeemers:', redeemersArray)
                props.onApprove(redeemersArray as RedeemersType<T>)
            } else {
                // Handle single transaction
                const redeemersSingle = await generateRedeemer(props.username, props.hash, pwd, props.tx)
                console.log('Redeemers:', redeemersSingle)
                props.onApprove(redeemersSingle as RedeemersType<T>)
            }
        } catch (err) {
            setErrMsg('Invalid password')
            console.log('Buidling redeemers error:', err)
        }
    }

    return (
        <Dialog
            open={props.open}
            maxWidth="lg"
            slotProps={{
                paper: {
                    component: 'form',
                    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault()
                        const formData = new FormData(event.currentTarget)
                        const formJson = Object.fromEntries((formData as any).entries())
                        buildRedeemers(formJson.password)
                    },
                },
            }}
        >
            <DialogTitle>
                Approval Required
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ pb: 2 }}>
                    Enter your password to confirm this transaction
                </DialogContentText>
                <TextField
                    fullWidth
                    autoFocus
                    required
                    id="password"
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    slotProps={{
                        input: {
                            endAdornment: <InputAdornment position='end'>
                                <IconButton
                                    aria-label={
                                        showPassword ? 'hide the password' : 'display the password'
                                    }
                                    onClick={handleClickShowPassword}
                                    onMouseDown={handleMouseDownPassword}
                                    onMouseUp={handleMouseUpPassword}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            </InputAdornment>
                        }
                    }}
                    onChange={() => setErrMsg('')}
                />
                {errMsg && <Alert severity="error">{errMsg}</Alert>}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button
                    color='inherit'
                    onClick={props.onCancel}
                >Cancel</Button>
                <Button type='submit' variant="contained" autoFocus>{props.approveText || "Send"}</Button>
            </DialogActions>
        </Dialog>
    )
}