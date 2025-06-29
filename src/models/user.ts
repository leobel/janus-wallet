import { MintUtxoRef } from "./mint-utxo-ref"

export type AccountTokenStatus = "pending" | "submitted" | "success" | "failed"
export interface User {
    id: string
    token_status: AccountTokenStatus,
    token_name: string
    pwd_hash: string
    pwd_kdf_hash: string
    spend_address: string
    policy_id: string
    nonce: string
    spend_script: {
        type: string
        script: string
    },
    mint_utxo_ref: MintUtxoRef
    circuit_id: string
    created_at: Date
    updated_at: Date
}