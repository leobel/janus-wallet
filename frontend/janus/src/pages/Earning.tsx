import { useState, useEffect, useRef } from 'react'
import { Typography, Card, CardContent, Box, CircularProgress, Drawer, Button, Stack, Divider, Toolbar, IconButton, Paper, Avatar, Alert, Tabs, Tab } from '@mui/material'
import type { StakePool } from '../models/stake-pool'
import { ApproveTransaction } from '../components/ApproveTransaction'
import CloseIcon from '@mui/icons-material/Close'
import useAuth from '../hooks/useAuth'
import AdaBalance from '../components/AdaBalance'
import { calculateFees, sleep } from '../utils'
import type { TransactionFees } from '../models/fees'
import { delegateToStakePool, getStakeDetials, registerAndDelegateToStakePool, sendTx } from '../services/wallet.service'
import type { StakeInfo } from '../models/stake-info'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { RewardHistory } from '../components/RewardHistory'
import { StakePools } from '../components/StakePools'

export default function StakingPage() {
  const { auth: session, balance } = useAuth()
  const [stakeInfo, setStakeInfo] = useState<StakeInfo>()
  const [selectedPool, setSelectedPool] = useState<StakePool | null>(null)
  const [confirmStake, setConfirmStake] = useState(false)
  const [stakeDetails, setStakeDetails] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  async function getStakeInfo(userId: string) {
    try {
      const stakeDetails = await getStakeDetials(userId)
      setStakeInfo(stakeDetails)
    } catch (err) {
      console.log('Error:', err)
    }
  }

  function handleSelectPool(pool: StakePool) {
    setSelectedPool(pool)
    setStakeDetails(true)
  }

  function handleCloseStakeDetails() {
    setStakeDetails(false)
    setSelectedPool(null)
  }

  function handleStake(pool: StakePool) {
    setSelectedPool(pool)
    showStakeConfirmation()
  }

  function showStakeConfirmation() {
    setConfirmStake(true)
  }

  function handleConfirmStakeClose() {
    setConfirmStake(false)
    setStakeDetails(false)
  }

  useEffect(() => {
    if (session.user) {
      getStakeInfo(session.user.id)
    }
  }, [session.user])

  return (
    <Box display="flex" flexDirection="column" sx={{ p: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Stake Details" />
          <Tab label="Pool List" />
          <Tab label="Rewards History" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box flexGrow={1} display="flex" flexDirection="column">
          {stakeInfo && isDelegating(stakeInfo) ? (
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Stake Address</Typography>
                    <Typography variant="body1">{stakeInfo.stake_address}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Status</Typography>
                    <Typography variant="body1">{stakeInfo.active ? 'Active' : 'Inactive'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Active Since Epoch</Typography>
                    <Typography variant="body1">{stakeInfo.active_epoch}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Controlled Amount</Typography>
                    <AdaBalance balance={Number(stakeInfo.controlled_amount)} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Total Rewards</Typography>
                    <AdaBalance balance={Number(stakeInfo.rewards_sum)} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Total Withdrawals</Typography>
                    <AdaBalance balance={Number(stakeInfo.withdrawals_sum)} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Withdrawable Amount</Typography>
                    <AdaBalance balance={Number(stakeInfo.withdrawable_amount)} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
              <Typography>You are not staking your funds.</Typography>
              <Typography>Go to <Button variant="text" onClick={() => setActiveTab(1)}>POOL LIST</Button> tab and select a pool to start earning!</Typography>
            </Box>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <StakePools onSelectedPool={handleSelectPool} handleStake={handleStake} />
      )}

      {activeTab === 2 && (
        <>
          {stakeInfo && isDelegating(stakeInfo) ? (
            <>
              {session.user && <RewardHistory userId={session.user.id} />}
            </>
          ) : (
            <Box flexGrow={1} display="flex" justifyContent="center" alignItems="center">
              <Typography>No rewards history</Typography>
            </Box>
          )}
        </>
      )}

      <Drawer
        anchor="right"
        open={!!selectedPool && stakeDetails}
        onClose={handleCloseStakeDetails}
      >
        {selectedPool && (
          <Box display="flex" flexDirection="column" sx={{ width: 600, p: 2, pt: 0, height: '100%' }}>
            <Toolbar />
            <Typography variant="h6" sx={{ py: 2 }}>
              {selectedPool.metadata?.name || 'Unnamed Pool'}
            </Typography>
            <Stack spacing={2}>
              <Typography>
                <strong>Ticker:</strong> {selectedPool.metadata?.ticker || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Pool ID:</strong> {selectedPool.pool_id}
              </Typography>
              <Typography variant="body2">
                <strong>Active Stake:</strong> {selectedPool.active_stake}
              </Typography>
              <Typography variant="body2">
                <strong>Live Stake:</strong> {selectedPool.live_stake}
              </Typography>
              <Typography variant="body2">
                <strong>Live Saturation:</strong> {selectedPool.live_saturation}%
              </Typography>
              <Typography variant="body2">
                <strong>Blocks Minted:</strong> {selectedPool.blocks_minted}
              </Typography>
              <Typography variant="body2">
                <strong>Margin Cost:</strong> {selectedPool.margin_cost}%
              </Typography>
              <Typography variant="body2">
                <strong>Fixed Cost:</strong> {selectedPool.fixed_cost} ADA
              </Typography>
              <Typography variant="body2">
                <strong>Declared Pledge:</strong> {selectedPool.declared_pledge} ADA
              </Typography>
            </Stack>
            {selectedPool.metadata?.description && (
              <Stack spacing={1}>
                <Divider sx={{ pt: 2 }} />
                <Typography variant="subtitle1">Description</Typography>
                <Typography variant="body2">
                  {selectedPool.metadata.description}
                </Typography>
              </Stack>
            )}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={showStakeConfirmation}
              sx={{ marginTop: 'auto' }}
            >
              Stake to this Pool
            </Button>
          </Box>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={!!selectedPool && confirmStake}
      >
        {session.user && balance && selectedPool &&
          <StakeConfirmation
            userId={session.user.id}
            userName={session.user.username}
            userHash={session.user.hash}
            stakePool={selectedPool}
            balance={balance.lovelace}
            isDelegating={isDelegating(stakeInfo)}
            onClose={handleConfirmStakeClose}
            onConfirm={() => { }} />
        }
      </Drawer>
    </Box>
  )
}

interface StakeConfirmationProps {
  userId: string
  userName: string
  userHash: string
  stakePool: StakePool
  balance: number
  isDelegating: boolean
  onClose(): void
  onConfirm(tx: string): void
}

function StakeConfirmation(props: StakeConfirmationProps) {
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [poolImageSrc, setPoolImageSrc] = useState()
  const [buildingTx, setBuildingTx] = useState(false)
  const [buildingTxErrMsg, setBuildingTxErrMsg] = useState('')
  const [fees, setFees] = useState<TransactionFees | null>()
  const [tx, setTx] = useState('')
  const [txId, setTxId] = useState('')
  const [txErrMsg, setTxErrMsg] = useState('')
  const [sendingTx, setSendingTx] = useState(false)
  const [openSignTx, setOpenSignTx] = useState(false)

  const deposit = props.isDelegating ? 0 : 2_000_000

  const fetchImageSrc = async (url: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return
      }
      const json = await response.json()
      if (json) {
        if (json.info) {
          const src = json.info["url_png_icon_64x64"]
          setPoolImageSrc(src)
        }
        else if (json.extended) {
          await fetchImageSrc(json.extended)
        }
      }
    } catch (err) {
      console.error('Error fetching pool metadata:', err)
    } finally {
      setLoadingAvatar(false)
    }
  }

  async function buildTx(userId: string, poolId: string, isDelegating: boolean) {
    try {
      const { tx: partialTx } = await (isDelegating ? delegateToStakePool(userId, poolId) : registerAndDelegateToStakePool(userId, poolId))
      setTx(partialTx)
      const fees = calculateFees(partialTx)
      setFees(fees)
    } catch (err) {
      console.log('Error buidling tx:', err)
      setBuildingTxErrMsg('Something went wrong. Please check you have enough funds to delegate')
    } finally {
      setBuildingTx(false)
    }
  }

  async function handleStakeTx(redeemers: string[]) {
    setOpenSignTx(false)
    try {
      setSendingTx(true)
      const { tx_id: txId } = await sendTx(props.userId, tx, redeemers)
      console.log('TxId:', txId)
      await sleep(2000)
      setTxId(txId)
    } catch (err) {
      console.log('Sending tx error:', err)
      setTxErrMsg("Transaction failed. Please try again.")
    } finally {
      setSendingTx(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(txId)
  }

  function handleOpen() {
    const url = `${import.meta.env.VITE_CARDANO_EXPLORER}tx/${txId}`
    window.open(url, '_blank', "noopener noreferrer")
  }

  useEffect(() => {
    if (props.stakePool.metadata?.url) {
      setLoadingAvatar(true)
      fetchImageSrc(props.stakePool.metadata.url)
    }

    if (props.userId && props.stakePool) {
      setBuildingTx(true)
      buildTx(props.userId, props.stakePool.pool_id, props.isDelegating)
    }

  }, [props.userId, props.stakePool, props.isDelegating])


  return (
    <Box display="flex" flexDirection="column" sx={{ width: 600, p: 2, pt: 0, height: '100%' }}>
      <Toolbar />
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 2, position: 'relative' }}>
        <Typography>
          Manage staking
        </Typography>
        <IconButton onClick={props.onClose} sx={{ position: 'absolute', right: 0 }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      {!sendingTx && !txId && <>
        {txErrMsg && <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center" >
          <ErrorOutlineOutlinedIcon color='error' sx={{ width: 86, height: 86, mb: 2 }} />
          <Alert icon={false} severity='error'>{txErrMsg}</Alert>
        </Box>}
        {!txErrMsg && <>
          <Box display="flex" flexDirection="column">
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" sx={{ mb: 4 }}>
              <Box sx={{ p: 2 }}>
                {!loadingAvatar && <>
                  {poolImageSrc && <Avatar src={poolImageSrc} sx={{ width: 64, height: 64 }} />}
                  {!poolImageSrc && <ErrorOutlineOutlinedIcon color='warning' sx={{ width: 64, height: 64 }} />}
                </>
                }
              </Box>
              <Typography>Confirm Stake</Typography>
              <Typography variant="body1" textAlign="center" sx={{ pt: 2 }}>Your entire balance will be staked</Typography>
              <Typography variant="body2" color="info">without ever leave your wallet</Typography>
            </Box>
            <Stack spacing={2} sx={{ mb: 4 }}>
              <Stack>
                <Typography fontSize="small">Stake Pool</Typography>
                <Typography variant='h6'>{props.stakePool.metadata ? props.stakePool.metadata.name || props.stakePool.metadata.ticker : 'Unknown'}</Typography>
              </Stack>
              <Stack>
                <Typography fontSize="small">Amount to stake</Typography>
                <AdaBalance balance={props.balance} />
                {/* <Typography>{props.balance}</Typography> */}
              </Stack>
            </Stack>
            <Stack spacing={1}>

              {buildingTx && <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                <CircularProgress size={26} />
                <Typography alignContent="center">Calculating cost...</Typography>
              </Stack>}
              {!buildingTx && <>
                <Typography>Transaction cost</Typography>
                <Divider />
                {deposit > 0 && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Staking deposit</Typography>
                    <AdaBalance balance={deposit} />
                  </Box>
                )}
                {fees &&
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Fee</Typography>
                    <AdaBalance balance={fees.txFee} />
                  </Box>
                }
                {buildingTxErrMsg && <Alert severity="error">{buildingTxErrMsg}</Alert>}
              </>}
            </Stack>
          </Box>
          <Button
            variant='contained'
            sx={{ mt: 'auto' }}
            onClick={() => setOpenSignTx(true)}
          >Confirm</Button>
        </>}
      </>}
      {!sendingTx && txId && <>
        <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center" >
          <CheckCircleOutlinedIcon color='success' sx={{ width: 86, height: 86, mb: 2 }} />
          <Typography>Congratulations! You've staked your funds</Typography>
          <Typography>You'll start receiving rewards after {deposit > 0 ? "four" : "two"} epochs.</Typography>
          <Paper sx={{ p: 2, mt: 2 }}>
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
        </Box>
        <Button
          variant='contained'
          sx={{ mt: 'auto' }}
          onClick={props.onClose}
        >Close</Button>
      </>}
      {sendingTx && <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center" >
        <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
          <CircularProgress size={26} />
          <Typography alignContent="center">Staking your funds...</Typography>
        </Stack>
      </Box>}
      <ApproveTransaction
        open={openSignTx}
        username={props.userName}
        hash={props.userHash}
        tx={tx}
        onApprove={handleStakeTx}
        onCancel={() => setOpenSignTx(false)} />
    </Box>
  )
}

function isDelegating(stakeInfo?: StakeInfo): boolean {
  return !!stakeInfo?.active && !!stakeInfo.pool_id
}
