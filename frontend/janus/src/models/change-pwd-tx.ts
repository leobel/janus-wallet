export interface ChangePasswordTx {
    change_password_id: string
    tx_id: string
    tx_cbor: string
    amount: number
    type: AccountChangeTxType
    status: AccountChangeTxStatus
}

export type AccountChangeTxStatus = "pending" | "submitted" | "success" | "failed"
export type AccountChangeTxType = "SEND_FUNDS" | "UPDATE_ACCOUNT_TOKEN"