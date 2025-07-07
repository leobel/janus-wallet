import { MintUtxoRef } from "./mint-utxo-ref"

export type AccountChangeStatus = "pending" | "submitted" | "success" | "failed"
export interface ChangePassword {
    id: string
    user_id: string
    spend_address: string
    pwd_hash: string
    pwd_kdf_hash: string
    nonce: string
    spend_script: {
        type: string
        script: string
    },
    mint_utxo_ref: MintUtxoRef
    balance: number
    created_at: Date
    updated_at: Date
}