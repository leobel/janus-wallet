export interface StakeInfo {
    stake_address: string
    active: boolean
    active_epoch: number
    controlled_amount: number
    rewards_sum: number
    withdrawals_sum: number
    withdrawable_amount: number
    reserves_sum: number
    treasury_sum: number
    drep_id: string
    pool_id: string
}