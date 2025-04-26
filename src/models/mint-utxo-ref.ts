export interface MintUtxoRef {
    tx_hash: string;
    output_index: number;
    lovelace: number;
    datum: string;
}