import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, TextField } from "@mui/material"
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useState } from "react"
import { generateRedeemer } from "../utils/hashing"

export interface ApproveTransactionProps {
    open: boolean
    username: string
    hash: string
    tx: string
    approveText?: string
    onApprove(redeemers: string[]): void
    onCancel(): void
}

export function ApproveTransaction(props: ApproveTransactionProps) {
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
            const redeemers = await generateRedeemer(props.username, props.hash, pwd, props.tx)
            console.log('Redeemers:', redeemers)
            props.onApprove(redeemers)
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