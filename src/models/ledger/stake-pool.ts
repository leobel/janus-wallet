export interface StakePool {
    pool_id: string
    hex: string
    active_stake: string
    live_stake: string
    live_saturation: number
    blocks_minted: number
    margin_cost: number
    fixed_cost: string
    declared_pledge: string
    metadata: StakePoolMetadata
}

interface StakePoolMetadata {
    hash: string
    url: string
    ticker: string
    name: string
    description: string
    homepage: string
}