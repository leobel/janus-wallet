import { useEffect, useMemo, useRef, useState } from "react"
import { Avatar, Box, Button, Card, CardActions, CardContent, CardHeader, Chip, CircularProgress, Divider, Grid, IconButton, Stack, Typography } from "@mui/material"
import type { Drep } from "../models/drep"
import { getDrepDetails, getDreps } from "../services/drep.service"
import { GitHub, Instagram, Language, LinkedIn, Telegram, Twitter } from "@mui/icons-material"
import Address from "./Address"
import AdaBalance from "./AdaBalance"
import { getDrepImg, getDrepName } from "../utils"

export interface DRepsProps {
    onSelectedDrep(drep: Drep): void
    handleDelegate(drep: Drep): void
}

export function DReps(props: DRepsProps) {
    const [dreps, setDreps] = useState<Drep[]>([])
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const initialLoadDone = useRef(false)

    async function loadDreps() {
        if (loading || !hasMore) return

        setLoading(true)
        try {
            const newDreps = await getDreps(10, page)
            const _dreps = await Promise.all(newDreps.items.map(item => getDrepDetails(item.drep_id)))
            setHasMore(newDreps.hasMore)
            setDreps(prev => [...prev, ..._dreps])
            if (newDreps.hasMore) {
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error loading dreps:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleScroll(event: React.UIEvent<HTMLDivElement>) {
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
            loadDreps()
        }
    }

    useEffect(() => {
        if (!initialLoadDone.current) {
            initialLoadDone.current = true
            loadDreps()
        }

    }, [])

    return (
        <Box onScroll={handleScroll} sx={{ p: 2, height: 'calc(100vh - 161px)', overflow: 'auto' }}>
            <Grid container spacing={3}>
                {dreps.map((drep) => (
                    <Grid key={drep.drep_id} size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <DrepCard drep={drep} handleDelegate={props.handleDelegate} />
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

export interface DRepCardProps {
    drep: Drep
    handleDelegate(drep: Drep): void
}


function DrepCard(props: DRepCardProps) {
    const drepImg = useMemo(() => getDrepImg(props.drep), [props.drep])
    const drepName = useMemo(() => getDrepName(props.drep), [props.drep])
    const drepLinks = useMemo(() => getDrepLinks(props.drep), [props.drep])


    function getDrepLinks(drep: Drep) {
        const links = drep.json_metadata?.body?.references ?? []
        return links.map((l: any) => typeof l.uri === 'object' ? { ...l, uri: l.uri["@value"] } : l)
    }

    function getUrlIcon(uri: string) {
        if (uri?.startsWith("twitter.com") || uri?.includes("x.com")) {
            return <Twitter fontSize="small" />;
        }
        if (uri?.includes("github.com")) {
            return <GitHub fontSize="small" />;
        }
        if (uri?.includes("instagram.com")) {
            return <Instagram fontSize="small" />;
        }
        if (uri?.includes("t.me")) {
            return <Telegram fontSize="small" />;
        }
        if (uri?.includes("linkedin.com")) {
            return <LinkedIn fontSize="small" />;
        }
        return <Language fontSize="small" />;
    }

    return (
        <Card variant="outlined" sx={{ maxHeight: 300 }}>
            <CardHeader sx={{ height: 76 }}
                avatar={
                    <Avatar
                        alt="Nicolas Cerny"
                        src={drepImg}
                        sx={{ width: 38, height: 38 }}
                    />
                }
                subheader={
                    <Box sx={{ display: 'flex', justifyContent: 'center' , alignItems: "center" }}>
                        <Stack>
                            <Typography>{drepName}</Typography>
                            <Stack direction="row">
                                {drepLinks.map((l: any) => (
                                    <IconButton aria-label="twitter" size="small" sx={{ p: 0 }} onClick={() => window.open(l.uri, '_blank', 'noopener noreferrer')}>
                                        {getUrlIcon(l.uri)}
                                    </IconButton>
                                ))}
                            </Stack>
                        </Stack>
                        <Chip sx={{ marginLeft: 'auto' }} label={props.drep.active ? "Active" : "Inactive"} color={props.drep.active ? "success" : "error"} />
                    </Box>
                }
            />
            <CardContent sx={{ pt: 0 }}>
                <Divider />
                <Box sx={{ pt: 1 }}>
                    <Typography variant="caption" display="block">
                        DRep Id
                    </Typography>
                    <Address value={props.drep.drep_id} copy shrink explore path="governance/drep" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Stack>
                        <Typography>Voting Power</Typography>
                        <AdaBalance balance={props.drep.amount} />
                    </Stack>
                </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" size="small" onClick={() => props.handleDelegate(props.drep)}>
                    Delegate
                </Button>
            </CardActions>
        </Card>
    );
}