export interface AccountBalance {
    lovelace: bigint;
    assets : Record<string, bigint>
    tx_count: number;
}