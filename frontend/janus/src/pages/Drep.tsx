import { useState, useEffect, useMemo } from 'react'
import { Typography, Paper, Box, CircularProgress, Drawer, Button, Stack, Divider, Toolbar, IconButton, Avatar, Alert, Tabs, Tab, ButtonGroup } from '@mui/material'
import { ApproveTransaction } from '../components/ApproveTransaction'
import CloseIcon from '@mui/icons-material/Close'
import useAuth from '../hooks/useAuth'
import AdaBalance from '../components/AdaBalance'
import { buildAlwaysAbstainDrep, buildAlwaysNoConfidenceDrep, calculateFees, getDrepImg, getDrepName, sleep } from '../utils'
import type { TransactionFees } from '../models/fees'
import { getStakeDetials, sendTx } from '../services/wallet.service'
import type { StakeInfo } from '../models/stake-info'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { DReps } from '../components/DReps'
import type { Drep, DrepType } from '../models/drep'
import { delegateToDrep } from '../services/drep.service'
import Address from '../components/Address'

const alwaysAbstainDrep = buildAlwaysAbstainDrep()
const alwaysNoConfidenceDrep = buildAlwaysNoConfidenceDrep()

export function DrepPage() {
    const { auth: session, balance } = useAuth()
    const [stakeInfo, setStakeInfo] = useState<StakeInfo>()
    const [selectedDrep, setSelectedDrep] = useState<Drep | null>(null)
    const [confirmDelegation, setConfirmDelegation] = useState(false)
    const [activeTab, setActiveTab] = useState(0)


    async function getStakeInfo(userId: string) {
        try {
            const stakeDetails = await getStakeDetials(userId)
            setStakeInfo(stakeDetails)
        } catch (err) {
            console.log('Error:', err)
        }
    }

    function handleSelectDrep(drep: Drep) {
        setSelectedDrep(drep)
    }


    function handleDelegate(drep: Drep) {
        setSelectedDrep(drep)
        showDelegateConfirmation()
    }

    function showDelegateConfirmation() {
        setConfirmDelegation(true)
    }

    function handleConfirmStakeClose() {
        setConfirmDelegation(false)
    }

    useEffect(() => {
        if (session.user && activeTab == 0) {
            getStakeInfo(session.user.id)
        }
    }, [session.user, activeTab])

    function DelegateAction() {
        return <ButtonGroup variant="outlined" aria-label="Delegate to drep" sx={{ mt: 2 }}>
            <Button onClick={() => setActiveTab(1)}>Choose a Drep</Button>
            <Button onClick={() => handleDelegate(alwaysAbstainDrep)}>Always Abstain</Button>
            <Button onClick={() => handleDelegate(alwaysNoConfidenceDrep)}>Always No Confidence</Button>
        </ButtonGroup>
    }

    return (
        <Box display="flex" flexDirection="column" sx={{ p: 3, height: "100vh" }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                    <Tab label="Delegation Details" />
                    <Tab label="Drep List" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Box className="drep" flexGrow={1} display="flex" flexDirection="column">
                    {stakeInfo && isDelegating(stakeInfo) ? (
                        <Paper elevation={2}>
                            <Stack sx={{ p: 3 }} gap={2}>
                                <Box>
                                    <Typography>Voting Power</Typography>
                                    <AdaBalance balance={balance?.lovelace} />
                                </Box>
                                <Box>
                                    <Typography>Delegating To</Typography>
                                    <Address value={stakeInfo.drep_id} size={58} copy shrink explore path="governance/drep" />
                                </Box>
                                <Box>
                                    <Typography>Change Delegation</Typography>
                                    <DelegateAction />
                                </Box>
                            </Stack>
                        </Paper>
                    ) : (
                        <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
                            <Typography>You are not delegating to a Delegated Representative (DRep) option: delegate to a DRep, choose to 'always abstain' or 'always no confidence.'</Typography>
                            <Typography> Rewards will continue to accumulate even without a DRep delegation. This requirement is enforced by the network.</Typography>
                            <DelegateAction />
                        </Box>
                    )}
                </Box>
            )}

            {activeTab === 1 && (
                <DReps onSelectedDrep={handleSelectDrep} handleDelegate={handleDelegate} />
            )}

            <Drawer
                anchor="right"
                open={!!selectedDrep && confirmDelegation}
            >
                {session.user && balance && selectedDrep &&
                    <DrepDelegationConfirmation
                        userId={session.user.id}
                        userName={session.user.username}
                        userHash={session.user.hash}
                        drep={selectedDrep}
                        balance={balance.lovelace}
                        isDelegating={isDelegating(stakeInfo)}
                        onClose={handleConfirmStakeClose}
                        onConfirm={() => { }} />
                }
            </Drawer>
        </Box>
    )
}

interface DrepDelegationConfirmationProps {
    userId: string
    userName: string
    userHash: string
    drep: Drep
    balance: number
    isDelegating: boolean
    onClose(): void
    onConfirm(tx: string): void
}

function DrepDelegationConfirmation(props: DrepDelegationConfirmationProps) {
    const [buildingTx, setBuildingTx] = useState(false)
    const [buildingTxErrMsg, setBuildingTxErrMsg] = useState('')
    const [fees, setFees] = useState<TransactionFees | null>()
    const [tx, setTx] = useState('')
    const [txId, setTxId] = useState('')
    const [txErrMsg, setTxErrMsg] = useState('')
    const [sendingTx, setSendingTx] = useState(false)
    const [openSignTx, setOpenSignTx] = useState(false)

    const drepImg = useMemo(() => getDrepImg(props.drep), [props.drep])
    const drepName = useMemo(() => getDrepName(props.drep), [props.drep])

    async function buildTx(userId: string, drepHex: string, type: DrepType) {
        try {
            const { tx: partialTx } = await delegateToDrep(userId, drepHex, type)
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

    function getDrepType(drep: Drep): DrepType {
        return drep.is_always_abstain ? "AlwaysAbstain" : drep.is_always_non_confindence ? "AlwaysNoConfidence" : "Key"
    }

    useEffect(() => {
        if (props.userId && props.drep) {
            setBuildingTx(true)
            buildTx(props.userId, props.drep.hex, getDrepType(props.drep))
        }

    }, [props.userId, props.drep, props.isDelegating])


    return (
        <Box display="flex" flexDirection="column" sx={{ width: 600, p: 2, pt: 0, height: '100%' }}>
            <Toolbar />
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 2, position: 'relative' }}>
                <Typography>
                    Manage delegating
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
                                <Avatar src={drepImg} sx={{ width: 64, height: 64 }} />
                            </Box>
                            <Typography>Confirm Delegation</Typography>
                            <Typography variant="body1" textAlign="center" sx={{ pt: 2 }}>Your entire voting power will be delegated</Typography>
                            <Typography variant="body2" color="info">without ever leave your wallet</Typography>
                        </Box>
                        <Stack spacing={2} sx={{ mb: 4 }}>
                            {props.drep.drep_id && <Stack>
                                <Typography>DRep Id</Typography>
                                <Address value={props.drep.drep_id} size={58} copy shrink explore path="governance/drep" />
                            </Stack>}
                            <Stack>
                                <Typography>Name</Typography>
                                <Typography>{drepName}</Typography>
                            </Stack>
                            <Stack>
                                <Typography fontSize="small">Voting Power</Typography>
                                <AdaBalance balance={props.balance} />
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
                    <Typography>Congratulations! You've delegate to a Drep</Typography>
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
                    <Typography alignContent="center">Delegating your voting power...</Typography>
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
    return !!stakeInfo?.active && !!stakeInfo.drep_id
}