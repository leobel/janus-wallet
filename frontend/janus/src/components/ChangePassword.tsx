import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material"
import { useFormik } from 'formik'
import { useState } from "react"
import * as yup from 'yup'
import useAuth from "../hooks/useAuth"
import { useNavigate } from "react-router"
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { hashCredentials, hashPassword } from "../utils/hashing"
import { buildChangePassword, sendChangePasswordTx, sendTx } from "../services/wallet.service"
import type { ChangePasswordTx } from "../models/change-pwd-tx"
import { ApproveTransaction } from "./ApproveTransaction"
import { sleep } from "../utils"
import { useEffect } from "react"

export function changePassword() {
    const { auth: session, signOut } = useAuth()
    const [errMsg, setErrMsg] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [changingPwd, setChangingPwd] = useState(false)
    const [openSignTx, setOpenSignTx] = useState(false)
    const [sendingTx, setSendingTx] = useState(false)
    const [txErrMsg, setTxErrMsg] = useState('')
    const [txs, setTxs] = useState<ChangePasswordTx[]>([])
    const [txIds, setTxIds] = useState<string[]>()
    const [countdown, setCountdown] = useState<number | null>(null)
    const navigate = useNavigate()

    if (!session.user) {
        navigate('/login')
        return
    }

    const userId = session.user!.id
    const username = session.user!.username
    const pwdHash = session.user!.hash

    const validationSchema = yup.object({
        password: yup
            .string()
            .required('New Password is required'),
        confirmPassword: yup
            .string()
            .required('Confirm Password is required')
            .oneOf([yup.ref('password')], 'Confirm Password must match'),
    })

    const formik = useFormik({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validationSchema: validationSchema,
        onSubmit: async (/*{ username, password }*/ { password }) => {
            try {
                setErrMsg('')
                setChangingPwd(true)
                const kdfHash = await hashPassword(password, '$2b$10$ly7CpcrlBxnwywAkZ4INDO')
                const hash = await hashCredentials(username, password)
                if (hash === pwdHash) {
                    setErrMsg('New password must be different to the current one')
                } else {
                    const changePwdTxs = await buildChangePassword(userId, hash, kdfHash)
                    console.log('Change Pwd txs:', changePwdTxs)
                    setTxs(changePwdTxs)
                    setOpenSignTx(true)
                }
            } catch (err: any) {
                console.log('Change Password Error:', err)
                if (!err?.response) {
                    setErrMsg('No Server Response')
                } else if (err.response?.status === 401) {
                    setErrMsg('Invalid Credentials')
                } else {
                    setErrMsg('Change Password Failed')
                }
                // errRef.current.focus()
            } finally {
                setChangingPwd(false)
            }
        },
    })

    async function handleSendTx(redeemers: string[][]) {
        setOpenSignTx(false)
        console.log('Redeemers:', redeemers)
        try {
            setSendingTx(true)
              const _txIds = await Promise.all(txs.map(async (tx, i) => {
                  const { tx_id: txId } = await sendChangePasswordTx(userId, tx.change_password_id, tx.tx_id, tx.tx_cbor, redeemers[i])
                  console.log('TxId:', txId)
                  return txId
              }))
            // const txId = "730cdee9dbb6f282f208f21b7c1f411c71fc87513702439bcbb0b661489d2deb"
            // setTxIds(["730cdee9dbb6f282f208f21b7c1f411c71fc87513702439bcbb0b661489d2deb"])
            setTxIds(_txIds)
            setCountdown(3) // Start countdown when txIds is set
        } catch (err) {
            setTxErrMsg("Transaction failed. Please try again.")
            console.log('Sending tx error:', err)
        } finally {
            setSendingTx(false)
        }
    }

    // Countdown effect for sign out
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            signOut()
            navigate('/login')
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000)
        return () => clearTimeout(timer)
    }, [countdown, signOut, navigate])

    const handleClickShowPassword = () => setShowPassword((show) => !show)

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    return <Stack gap={3} sx={{ p: 4 }}>
        <Box>
            <form onSubmit={formik.handleSubmit} noValidate>
                <Stack spacing={2} sx={{ minWidth: 0 }}>
                    <TextField
                        fullWidth
                        id="password"
                        name="password"
                        label="New Password"
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
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        error={formik.touched.password && Boolean(formik.errors.password)}
                        helperText={formik.touched.password && formik.errors.password}
                    />
                    <TextField
                        fullWidth
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm New Password"
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
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                        helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                    />
                    {errMsg && <Alert severity="error">{errMsg}</Alert>}
                    <Button
                        color="primary"
                        variant="contained"
                        fullWidth
                        type="submit"
                        loading={changingPwd}
                    >
                        CHANGE PASSWORD
                    </Button>
                </Stack>
            </form>
        </Box>
        {sendingTx && <Box sx={{ display: 'flex' }}>
            <CircularProgress size={24} sx={{mr: 2}}/>
            <Typography>Processing Transactions...</Typography>
        </Box>}
        {(!sendingTx && txIds) && <Stack>
            <Typography>You've changed your wallet password successfully!</Typography>
            <Typography color="text.secondary">
                Signing out in {countdown} seconds
            </Typography>
        </Stack>}
        <ApproveTransaction
            open={openSignTx}
            username={username}
            hash={pwdHash}
            tx={txs.map(tx => tx.tx_cbor)}
            onApprove={handleSendTx}
            onCancel={() => setOpenSignTx(false)} />
    </Stack>
}