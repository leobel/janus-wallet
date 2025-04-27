export interface MintUtxoRef {
    tx_hash: string;
    output_index: number;
    assets: MintUtxoRefAssets;
    datum: string;
}

export type MintUtxoRefAssets = Record<string | "lovelace", number>;