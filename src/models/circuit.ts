import { MintUtxoRef } from "./mint-utxo-ref";

export interface Circuit {
    id: string;
    version: number;
    owner: string;
    nonce: string;
    policy_id: string;
    asset_name: string;
    mint_address: string;
    mint_utxo: {
        tx_id: string;
        index: number;
    };
    mint_script: {
        type: string;
        script: string;
    };
    zk_verification_key: MintUtxoRef;
    created_at: Date;
    updated_at: Date;
}