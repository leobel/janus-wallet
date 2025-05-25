export interface AddressTotalResponse {
    address: string;
    received_sum: AddressTotalAssetResponse[];
    sent_sum: AddressTotalAssetResponse[];
    tx_count: string
}

export interface AddressTotalAssetResponse{
    unit: string | "lovelace";
    quantity: string
}