import { useState, useEffect, useRef } from 'react'
import { Typography, Card, CardContent, Grid, Box, CircularProgress, Drawer, Button, Stack, Divider, Toolbar } from '@mui/material'
import { getStakePools } from '../services/stake.service'
import type { StakePool } from '../models/stake-pool'

export default function StakingPage() {
  const [stakePools, setStakePools] = useState<StakePool[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPool, setSelectedPool] = useState<StakePool | null>(null)
  const initialLoadDone = useRef(false)

  const loadStakePools = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const newPools = await getStakePools(100, page)
      if (!newPools.hasMore) {
        setHasMore(false)
      } else {
        setStakePools(prev => [...prev, ...newPools.pools])
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error loading stake pools:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      loadStakePools()
    }
  }, [])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadStakePools()
    }
  }

  const handleStake = () => {
    // TODO: Implement stake functionality
    console.log('Staking to pool:', selectedPool?.pool_id)
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 64px)', overflow: 'auto' }} onScroll={handleScroll}>
      <Typography variant="h4" gutterBottom>
        Stake Pools
      </Typography>
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
              onClick={() => setSelectedPool(pool)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {pool.metadata?.name || 'Unnamed Pool'}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Ticker: {pool.metadata?.ticker || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Active Stake: {pool.active_stake}
                </Typography>
                <Typography variant="body2">
                  Live Saturation: {pool.live_saturation}%
                </Typography>
                <Typography variant="body2">
                  Blocks Minted: {pool.blocks_minted}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}

      <Drawer
        anchor="right"
        open={!!selectedPool}
        onClose={() => setSelectedPool(null)}
      >
        {selectedPool && (
          <Box display="flex" flexDirection="column" sx={{ maxWidth: 600, p: 2, pt: 0, height: '100%' }}>
            <Toolbar />
            <Typography variant="h6" sx={{ py: 2}}>
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
                <Divider sx={{pt: 2}}/>
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
              onClick={handleStake}
              sx={{ marginTop: 'auto' }}
            >
              Stake to this Pool
            </Button>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
