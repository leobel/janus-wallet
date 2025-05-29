import { Box, Button, List, ListItem, ListItemIcon, ListItemButton, ListItemText, Snackbar, styled, Typography, Stack, Divider, IconButton, TextField, StepContent, InputAdornment } from '@mui/material'
import { CARDANO_NETWORK, checkWalletNetwork, getMintAccountPrice, getSupportedWallets, getWalletFunds, openWallet, walletSignTx, type SupportedWallet, type Wallet } from '../utils/walletApi'
import { NotificationsProvider, useNotifications } from '@toolpad/core'
import Base64Icon from '../components/utility/Base64Icon'
import { useState } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CircleIcon from '@mui/icons-material/Circle'
import { mintAccount, userExist } from '../services/wallet.service'

import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { createAccount } from '../services/auth.service'
import useAuth from '../hooks/useAuth'
import { hashCredentials, hashPassword } from '../utils/hashing'
import { useNavigate } from 'react-router'


const ContainsDigitRegexp = /\d/
const ContainsSpecialCharRegexp = /[!@#$%^&*(),.?":{}|<>]/
const ContainsUpperCaseCharRegexp = /[A-Z]/

interface PassworRule {
    description: string
    validator(pwd: string): boolean
}

const passwordRules: Record<string, PassworRule> = {
    0: {
        description: "Contains at least 12 characters",
        validator: (pwd) => pwd.length >= 12
    },
    1: {
        description: "Contains at least one digit",
        validator: (pwd) => ContainsDigitRegexp.test(pwd)
    },
    2: {
        description: "Contains at least one special character",
        validator: (pwd) => ContainsSpecialCharRegexp.test(pwd)
    },
    3: {
        description: "Contains at least one uppercase",
        validator: (pwd) => ContainsUpperCaseCharRegexp.test(pwd)
    },
}

function ScopedContent() {
    const notifications = useNotifications()
    const [activeStep, setActiveStep] = useState(0)
    const [wallet, setWallet] = useState<Wallet>()
    const [username, setUsername] = useState('')
    const [passsword, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isVerifyingUser, setIsVerifyingUser] = useState(false)
    const [validPassword, setValidPassword] = useState(false)
    const [validRules, setValidRules] = useState<Record<string, boolean>>({})
    const [signingTx, setSigningTx] = useState(false)
    const { setAuth } = useAuth()
    const navigate = useNavigate()

    async function connectWallet(wallet: SupportedWallet) {
        try {
            const walletApi = await openWallet(wallet)
            const validNetwork = await checkWalletNetwork(walletApi)
            if (!validNetwork) {
                notifications.show(`network mismatch, please open your wallet on '${CARDANO_NETWORK}'`, {
                    severity: 'error',
                    autoHideDuration: 5000
                })
                return
            }

            setWallet({ api: walletApi, code: wallet.code })

        } catch (err) {
            console.log(err)
            notifications.show(`An unknown error occurred `, {
                key: 'connection-error',
                severity: 'error',
                autoHideDuration: 5000
            })
        }

    }

    async function confirmCreateAccount() {
        if (!wallet) {
            return
        }
        try {
            setSigningTx(true)
            const price = await getMintAccountPrice(wallet.api, username)
            console.log('Price:', price)
            const { utxos, changeAddress } = await getWalletFunds(wallet.api, price)
            console.log('Utxos:', utxos)
            console.log('changeAddress:', changeAddress)
            const kdfHash = await hashPassword(passsword, '$2b$10$ly7CpcrlBxnwywAkZ4INDO')
            const hash = await hashCredentials(username, passsword)

            const { user, cbor_tx: unsignedTx } = await createAccount(username, hash, kdfHash, utxos, changeAddress)
            const witnessSet = await walletSignTx(wallet.api, unsignedTx)

            const txId = await mintAccount(user.id, unsignedTx, witnessSet)

            setAuth({ user })
            navigate('/')
        } catch (err) {
            console.log(err)
            notifications.show(`An unknown error signing transaction occurred `, {
                key: 'connection-error',
                severity: 'error',
                autoHideDuration: 5000
            })
        } finally {
            setSigningTx(false)
        }
    }

    function nextStep() {
        setActiveStep(prev => prev + 1)
    }

    function previuosStep() {
        setActiveStep(prev => prev - 1)
    }

    async function verifyUserExist() {
        try {
            setIsVerifyingUser(true)
            const exist = await userExist(username)
            if (exist) {
                notifications.show(`User: '${username}' already exist, please try again`, {
                    severity: 'error',
                    autoHideDuration: 5000
                })
            }
            nextStep()
        } catch (error) {
            notifications.show(`An unknown error verifying username '${username}' occurred `, {
                key: 'connection-error',
                severity: 'error',
                autoHideDuration: 5000
            })
        } finally {
            setIsVerifyingUser(false)
        }
    }

    function checkPasswordRules(pwd: string): string[] {
        return Object.entries(passwordRules).filter(([_, rule]) => rule.validator(pwd)).map(([id]) => id)
    }

    function verifyPassword(pwd: string) {
        setPassword(pwd)
        const rules = checkPasswordRules(pwd)
        if (rules.length == Object.keys(passwordRules).length) {
            setValidPassword(true)
        } else {
            setValidPassword(false)
        }

        setValidRules(rules.reduce((acc, rule) => ({ ...acc, [rule]: true }), {}))
    }

    const handleClickShowPassword = () => setShowPassword((show) => !show)

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    return (
        <Box
            display="flex"
            minHeight="100vh"
        >
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="33%"
                sx={{ backgroundColor: 'hsl(200, 10%, 4%)', p: '40px' }}>
                <Stack>
                    <Typography fontSize="xx-large">Connect your wallet</Typography>
                    <Typography fontSize="small">
                        By connecting your wallet you agree to our Terms & Privacy policy
                    </Typography>
                    <Divider sx={{ padding: '10px 0' }} />
                    <List >
                        {getSupportedWallets().map(w => (
                            <ListItem
                                key={w.code}
                                disableGutters
                                secondaryAction={w.code === wallet?.code ? <IconButton edge="end" aria-label="delete">
                                    <CheckIcon />
                                </IconButton> : null}
                                onClick={() => connectWallet(w)}>
                                <ListItemButton disableGutters>
                                    {w.src && <Base64Icon src={w.src} />}
                                    <ListItemText primary={w.name} sx={{ paddingLeft: '10px' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Stack>

            </Box>
            <Box
                flexGrow="1"
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ backgroundColor: '#1b1b1b', p: '40px' }}>
                <Box>
                    {wallet && (
                        <Stepper activeStep={activeStep} orientation="vertical">
                            <Step key="username" active={activeStep >= 0}>
                                <StepLabel>Username</StepLabel>
                                <StepContent>
                                    <Box display="flex" flexDirection="column" sx={{ mb: '10px' }}>
                                        <Typography
                                            sx={{ paddingTop: '10px', paddingBottom: '30px' }}>
                                            Provide an unique username that's going to identify your account
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <TextField
                                                fullWidth
                                                id="standard-basic"
                                                label=""
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                            />
                                            <Button
                                                variant="contained"
                                                disabled={!username || activeStep != 0}
                                                loading={isVerifyingUser}
                                                onClick={verifyUserExist}
                                            >
                                                Verify
                                            </Button>
                                        </Stack>
                                    </Box>
                                </StepContent>
                            </Step>
                            <Step active={activeStep >= 1}>
                                <StepLabel>Password</StepLabel>
                                <StepContent>
                                    <Box display="flex" flexDirection="column" sx={{ mb: '10px' }}>
                                        <Typography
                                            sx={{ paddingTop: '10px', paddingBottom: '30px' }}>
                                            This is the password for controlling your wallet
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <TextField
                                                fullWidth
                                                id="standard-basic"
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
                                                label=""
                                                value={passsword}
                                                onChange={(e) => verifyPassword(e.target.value)}
                                            />
                                            <Button
                                                variant="contained"
                                                disabled={!validPassword || activeStep != 1}
                                                onClick={nextStep}
                                            >
                                                Next
                                            </Button>
                                        </Stack>
                                        <Stack>
                                            <List>
                                                {Object.entries(passwordRules).map(([id, rule]) => (
                                                    <ListItem disableGutters key={rule.description} sx={{ py: 0 }}>
                                                        <ListItemIcon sx={{ minWidth: '24px' }}>
                                                            {validRules[id] &&
                                                                <CheckCircleIcon color="success" fontSize='small' />
                                                            }
                                                            {!validRules[id] &&
                                                                <CircleIcon color="disabled" fontSize='small' />
                                                            }
                                                        </ListItemIcon>
                                                        <ListItemText primary={rule.description} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Stack>
                                    </Box>
                                </StepContent>
                            </Step>
                            <Step active={activeStep >= 2}>
                                <StepLabel>Create Account</StepLabel>
                                <StepContent>
                                    <Box display="flex" flexDirection="column" sx={{ mb: '10px' }}>
                                        <Typography
                                            sx={{ paddingTop: '10px', paddingBottom: '30px' }}>
                                            Click on "Confirm" to create your account. It'll ask your wallet to sign the transaction
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            loading={signingTx}
                                            onClick={confirmCreateAccount}
                                        >
                                            Confirm
                                        </Button>
                                    </Box>
                                </StepContent>
                            </Step>
                        </Stepper>
                    )}
                </Box>
            </Box>
        </Box>
    )
}

export default function SignUp() {
    return (
        <NotificationsProvider
            slots={{ snackbar: styled(Snackbar)({ position: 'absolute', }) }}
            slotProps={{
                snackbar: {
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                },
            }}>
            <ScopedContent />
        </NotificationsProvider>
    )
}