import { Alert, Box, Button, Chip, CircularProgress, Divider, Grid, IconButton, InputAdornment, Paper, Stack, Step, StepButton, StepContent, StepLabel, Stepper, TextField } from '@mui/material'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Address from '../components/Address'
import useAuth from '../hooks/useAuth'
import AdaBalance, { formatAdaBalance } from '../components/AdaBalance'
import { calculateFees, fromLovelace, sleep, toLovelace } from '../utils'
import { buildSpendTx, sendTx } from '../services/wallet.service'
import type { TransactionFees } from '../models/fees'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import StepIcon, { type StepIconProps } from '@mui/material/StepIcon'
import { ApproveTransaction } from '../components/ApproveTransaction'

export default function SendPage() {
  const { balance, auth: session } = useAuth()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [formattedAmount, setFormattedAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [assets] = useState<Record<string, number>>()
  const [fees, setFees] = useState<TransactionFees | null>()
  const [tx, setTx] = useState('')
  const [txId, setTxId] = useState('')
  const [openSignTx, setOpenSignTx] = useState(false)
  const [sendingTx, setSendingTx] = useState(false)
  const [txErrMsg, setTxErrMsg] = useState('')

  function nextStep() {
    setActiveStep(prev => prev + 1)
  }

  function prevStep() {
    setActiveStep(prev => prev - 1)
  }

  function handleRecipient() {
    setFees(null)
    nextStep()
  }

  function handleAmount() {
    setFees(null)
    const value = toLovelace(Number(formattedAmount.replace(/,/g, '')))
    setAmount(value)
    nextStep()
  }

  function handleMax() {
    if (balance) {
      const value = formatAmmount(balance.lovelace.toString())
      setFormattedAmount(value)
    }
  }

  function formatAmmount(amount: string): string {
    const { whole, decimal } = formatAdaBalance(amount)
    return `${whole}${decimal}`
  }

  function handleAssets() {

    nextStep()
  }

  async function buildTx(userId: string) {
    const { tx: partialTx } = await buildSpendTx(userId, recipient, amount, assets)
    setTx(partialTx)
    const fees = calculateFees(partialTx)
    setFees(fees)
  }

  async function handleConfirm() {
    if (session.user) {
      setOpenSignTx(true)
    }
  }

  async function handleSendTx(redeemers: string[]) {
    setOpenSignTx(false)
    if (session.user) {
      console.log('Redeemers:', redeemers)
      try {
        setSendingTx(true)
        const { tx_id: txId } = await sendTx(session.user.id, tx, redeemers)
        console.log('TxId:', txId)
        await sleep(2000)
        // const txId = "730cdee9dbb6f282f208f21b7c1f411c71fc87513702439bcbb0b661489d2deb"
        setTxId(txId)
      } catch (err) {
        setTxErrMsg("Transaction failed. Please try again.")
        console.log('Sending tx error:', err)
      } finally {
        nextStep()
        setSendingTx(false)
      }

    }
  }

  function SendStepIcon(props: StepIconProps) {
    return sendingTx ? <CircularProgress size={24} /> : txId ? <CheckCircleIcon color='success' /> : activeStep === 4 ? <ErrorIcon color='error' /> : <StepIcon {...props} />
  }

  function getSubmittingStepLabel() {
    return sendingTx ? "Sending transaction..." : txId ? "Transaction sent" : activeStep === 4 ? "Transaction failed" : "Send Transaction"
  }

  function handleCopy() {
    navigator.clipboard.writeText(txId)
  }

  function handleOpen() {
    const url = `${import.meta.env.VITE_CARDANO_EXPLORER}tx/${txId}`
    window.open(url, '_blank', "noopener noreferrer")
  }

  useEffect(() => {
    if (session.user && activeStep === 3) {
      buildTx(session.user.id)
    }
  }, [activeStep, session])

  return (
    <Box
      display="flex"
      justifyContent="center"
      sx={{ p: 2 }}>
      <Box flexGrow="1">
        <Stepper nonLinear activeStep={activeStep} orientation="vertical">
          <Step key="recipient" completed={activeStep > 0}>
            <StepButton onClick={() => setActiveStep(0)}>
              <Stack>
                <Typography>Recipient</Typography>
                {0 < activeStep && <Address shrink size={35} value={recipient} />}
              </Stack>
            </StepButton>
            <StepContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  id="recipient"
                  label=""
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="text" color="inherit" onClick={() => navigate('/')}>Cancel</Button>
                  <Button variant="contained" onClick={handleRecipient}>Continue</Button>
                </Stack>
              </Stack>
            </StepContent>
          </Step>
          <Step key="tokens" completed={activeStep > 1}>
            <StepButton onClick={() => setActiveStep(1)}>
              <Stack>
                <Typography>Amount</Typography>
                {1 < activeStep && <AdaBalance balance={amount} />}
              </Stack>
            </StepButton>
            <StepContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  id="amount"
                  label=""
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position='end'>
                        <IconButton edge="end" onClick={handleMax}>
                          <Chip color="primary" label="Max" />
                        </IconButton>
                      </InputAdornment>
                    },
                  }}
                  value={formattedAmount}
                  onChange={(e) => setFormattedAmount(e.target.value)}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="text" color="inherit" onClick={() => prevStep()}>Back</Button>
                  <Button variant="contained" onClick={handleAmount}>Continue</Button>
                </Stack>
              </Stack>
            </StepContent>
          </Step>
          <Step key="assets" completed={activeStep > 2}>
            <StepButton onClick={() => setActiveStep(2)}>
              <Stack>
                <Typography>Assets</Typography>
              </Stack>
            </StepButton>
            <StepContent>
              <Stack direction="row" spacing={2}>
                <Button variant="text" color="inherit" onClick={() => prevStep()}>Back</Button>
                <Button variant="contained" onClick={handleAssets}>Skip</Button>
              </Stack>
            </StepContent>
          </Step>
          <Step key="fees" completed={activeStep > 3}>
            <StepButton onClick={() => setActiveStep(2)}>
              <Stack>
                <Typography>Fees Overview</Typography>
                {fees && <Typography fontSize="small">Total fees: {fromLovelace(fees.txFee + fees.assetsFee)} ADA</Typography>}
              </Stack>
            </StepButton>
            <StepContent>
              {fees &&
                <Stack spacing={2}>
                  <Paper sx={{ width: 360, p: 2 }}>
                    <Grid container spacing={2} sx={{
                      justifyContent: "center",
                      alignItems: "center",
                    }}>
                      <Grid size={6}>
                        <Typography fontSize="small">Transaction Fee</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography fontSize="small" textAlign="end">{fromLovelace(fees.txFee)} ADA</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography fontSize="small">Additional Assets</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography fontSize="small" textAlign="end">{fees.assetsFee ? fromLovelace(fees.assetsFee) : "None"}</Typography>
                      </Grid>
                      <Grid size={12}>
                        <Divider />
                      </Grid>
                      <Grid size={6}>
                        <Typography fontSize="small">Total fees</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography fontSize="small" textAlign="end">{fromLovelace(fees.txFee + fees.assetsFee)} ADA</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  <Stack direction="row" spacing={2}>
                    <Button variant="text" color="inherit" onClick={() => prevStep()}>Back</Button>
                    <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
                  </Stack>
                </Stack>
              }
              {!fees &&
                <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                  <CircularProgress size={26} />
                  <Typography alignContent="center">calculating fees...</Typography>
                </Stack>
              }
            </StepContent>
          </Step>
          <Step key="sent" completed={activeStep === 4}>
            <StepLabel slots={{
              stepIcon: SendStepIcon
            }}>{getSubmittingStepLabel()}</StepLabel>
            <StepContent>
              {txErrMsg && <Alert icon={false} severity="error">
                {txErrMsg}
              </Alert>}
              {!sendingTx && txId && (
                <Paper sx={{ width: 560, p: 2 }}>
                  <Box display="flex" flexDirection="column">
                    <Typography fontSize="small">Transaction Id:</Typography>
                    <Box display="flex">
                      <Stack flexGrow="1" direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Typography fontSize="small" textAlign="end" sx={{ wordBreak: 'break-word' }}>{txId}</Typography>
                        <Box>
                          <IconButton size="small" onClick={handleCopy}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={handleOpen} >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Stack>
                    </Box>
                  </Box>
                </Paper>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </Box>
      <ApproveTransaction 
        open={openSignTx} 
        username={session.user!.username} 
        hash={session.user!.hash} 
        tx={tx} 
        onApprove={handleSendTx} 
        onCancel={() => setOpenSignTx(false)} />
    </Box >
  )
}
