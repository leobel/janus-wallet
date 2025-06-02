export interface UserBalance {
    lovelace: number
    assets: Record<string, number>
    tx_count: number
}