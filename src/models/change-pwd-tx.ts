export type AccountChangeTxStatus = "pending" | "submitted" | "success" | "failed"
export type AccountChangeTxType = "SEND_FUNDS" | "UPDATE_ACCOUNT_TOKEN"
export interface ChangePasswordTx {
    id: string
    change_password_id: string
    tx_id: string
    tx_cbor: string
    amount: number
    type: AccountChangeTxType
    status: AccountChangeTxStatus
    created_at: Date
    updated_at: Date
}