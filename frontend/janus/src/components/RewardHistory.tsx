import { Box, List, ListItem, ListItemText, CircularProgress, Typography } from "@mui/material"
import { useEffect, useRef, useState } from "react"
import type { Reward } from "../models/stake-reward"
import { getStakeRewards } from "../services/stake.service"
import AdaBalance from "./AdaBalance"

export interface RewardHistoryProps {
    userId: string
}

export function RewardHistory(props: RewardHistoryProps) {
    const [rewards, setRewards] = useState<Reward[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const initialLoadDone = useRef(false)

    const loadRewards = async () => {
        if (loading || !hasMore) return

        setLoading(true)
        try {
            const response = await getStakeRewards(props.userId, 100, page)
            setHasMore(response.hasMore)
            setRewards(prev => [...prev, ...response.items])
            if (response.hasMore) {
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error("Failed to load rewards:", error)
        } finally {
            setLoading(false)
        }
    }

    function handleScroll(event: React.UIEvent<HTMLDivElement>) {
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
        console.log('scrolling', scrollHeight - scrollTop <= clientHeight * 1.5, scrollTop, clientHeight, scrollHeight)
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
            loadRewards()
        }
    }

    useEffect(() => {
        if (!initialLoadDone.current) {
            initialLoadDone.current = true
            loadRewards()
        }
    }, [])

    return (
        <Box onScroll={handleScroll} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 161px)', overflow: 'auto' }}>
            <List>
                {rewards.map((reward, index) => (
                    <ListItem key={`${reward.epoch}-${index}`} divider>
                        <ListItemText
                            primary={`Epoch ${reward.epoch}`}
                            secondary={
                                <>
                                    <Typography component="span" variant="body2" color="text.primary">
                                        <AdaBalance balance={reward.amount} />
                                    </Typography>
                                    <br />
                                    {`Pool: ${reward.pool_id}`}
                                </>
                            }
                        />
                    </ListItem>
                ))}
                <ListItem>
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <CircularProgress />
                        </Box>
                    )}
                </ListItem>
            </List>
        </Box>
    )
}