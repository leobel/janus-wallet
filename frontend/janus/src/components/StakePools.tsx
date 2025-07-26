import { useEffect, useRef, useState } from "react"
import type { StakePool } from "../models/stake-pool"
import { getStakePools } from "../services/stake.service"
import { Box, Button, Card, CardActions, CardContent, CircularProgress, Grid, Typography } from "@mui/material"
import AdaBalance from "./AdaBalance"

export interface StakePoolsProps {
    onSelectedPool(pool: StakePool): void
    handleStake(pool: StakePool): void
}

export function StakePools(props: StakePoolsProps) {
    const [stakePools, setStakePools] = useState<StakePool[]>([])
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const initialLoadDone = useRef(false)

    async function loadStakePools() {
        if (loading || !hasMore) return

        setLoading(true)
        try {
            const newPools = await getStakePools(100, page)
            setHasMore(newPools.hasMore)
            setStakePools(prev => [...prev, ...newPools.items])
            if (newPools.hasMore) {
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error loading stake pools:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleScroll(event: React.UIEvent<HTMLDivElement>) {
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
            loadStakePools()
        }
    }

    useEffect(() => {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true
          loadStakePools()
        }
      
      }, [])

    return (
        <Box onScroll={handleScroll} sx={{ p: 2, height: 'calc(100vh - 161px)', overflow: 'auto' }}>
            <Grid container spacing={3}>
                {stakePools.map((pool) => (
                    <Grid key={pool.pool_id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                            onClick={() => props.onSelectedPool(pool)}
                        >
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {pool.metadata?.name || 'Unnamed Pool'}
                                </Typography>
                                <Typography color="textSecondary" gutterBottom>
                                    Ticker: {pool.metadata?.ticker || 'N/A'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">Active Stake:</Typography>
                                    <AdaBalance balance={pool.active_stake} />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">Live Saturation:</Typography>
                                    <Typography variant="body2">{Number(pool.live_saturation * 100).toFixed(2)}%</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">Blocks Minted:</Typography>
                                <Typography variant="body2">{pool.blocks_minted}</Typography>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end' }}>
                                <Button size="small" color="primary" variant="contained" onClick={(e) => {
                                    e.stopPropagation()
                                    props.handleStake(pool)
                                }}>
                                    Stake
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <CircularProgress />
                </Box>
            )}
        </Box>
    )
}