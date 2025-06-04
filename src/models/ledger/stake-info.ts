export interface StakeInfo {
    stake_address: string
    active: boolean
    active_epoch: number
    controlled_amount: string
    rewards_sum: string
    withdrawals_sum: string
    reserves_sum: string
    treasury_sum: string
    drep_id: string
    withdrawable_amount: string
    pool_id: string
}