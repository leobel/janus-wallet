import axios from "../api/axios";
import type { StakeInfo } from "../models/stake-info";

export async function getWalletBalance(userId: string): Promise<any> {
    const response = await axios.get(`wallets/${userId}/balance`)
    return response.data
}

export async function userExist(username: string): Promise<boolean> {
    const response = await axios.post<boolean>(`userExist`, { username })
    return response.data
}

export async function mintAccount(userId: string, cborTx: string, witnessSet: string): Promise<string> {
    const response = await axios.post(`wallets/${userId}/mintAccount`, {
        vk_witnesses: witnessSet,
        cbor_tx: cborTx
    })
    return response.data
}

export async function buildSpendTx(userId: string, recipient: string, amount: number, assets?: Record<string, number>) {
    const response = await axios.post(`wallets/${userId}/build`, {
        amount,
        receive_address: recipient,
        assets
    })
    return response.data
}

export async function getStakeDetials(userId: string): Promise<StakeInfo> {
    const response = await axios.get(`wallets/${userId}/stakingDetails`)
    return response.data
}

export async function registerAndDelegateToStakePool(userId: string, poolId: string): Promise<{tx: string }> {
    const response = await axios.post(`wallets/${userId}/pools/${poolId}/registerAndDelegate`)
    return response.data
}

export async function delegateToStakePool(userId: string, poolId: string): Promise<{tx: string }> {
    const response = await axios.post(`wallets/${userId}/pools/${poolId}/delegate`)
    return response.data
}

export async function sendTx(userId: string, tx: string, redeemers: string[]): Promise<{tx_id: string}> {
    const response = await axios.post(`wallets/${userId}/send`, {
        redeemers,
        tx
    })
    return response.data
}