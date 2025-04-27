import { MintUtxoRef } from "./mint-utxo-ref";

export interface User {
    id: string;
    token_name: string;
    pwd_hash: string;
    spend_address: string;
    policy_id: string;
    nonce: string;
    spend_script: {
        type: string;
        script: string;
    },
    mint_utxo_ref: MintUtxoRef;
    created_at: Date;
    updated_at: Date;
}