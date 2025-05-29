export interface UserBalance {
    lovelace: string
    assets: Record<string, string>
    tx_count: number
}