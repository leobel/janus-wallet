import axios from "../api/axios";
import type { ChangePasswordTx } from "../models/change-pwd-tx";
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

export async function registerAndDelegateToStakePool(userId: string, poolId: string): Promise<{ tx: string }> {
    const response = await axios.post(`wallets/${userId}/pools/${poolId}/registerAndDelegate`)
    return response.data
}

export async function delegateToStakePool(userId: string, poolId: string): Promise<{ tx: string }> {
    const response = await axios.post(`wallets/${userId}/pools/${poolId}/delegate`)
    return response.data
}

export async function getStakePoolRewards(userId: string): Promise<{ tx: string }> {
    const response = await axios.post(`wallets/${userId}/rewards`)
    return response.data
}

export async function withdrawRewards(userId: string, amount: number): Promise<{ tx: string }> {
    const response = await axios.post(`wallets/${userId}/withdraw`, {
        amount
    })
    return response.data
}

export async function sendTx(userId: string, tx: string, redeemers: string[]): Promise<{ tx_id: string }> {
    const response = await axios.post(`wallets/${userId}/send`, {
        redeemers,
        tx
    })
    return response.data
}

export async function buildChangePassword(userId: string, hash: string, kdfHash: string, nonce?: string): Promise<ChangePasswordTx[]> {
    const response = await axios.post(`wallets/${userId}/buildChangePassword`, {
        hash,
        kdf_hash: kdfHash,
        nonce
    })
    return response.data
}

export async function sendChangePasswordTx(userId: string, pwd_id: string, tx_id: string, tx: string, redeemers: string[]): Promise<{ tx_id: string }> {
    const response = await axios.post(`wallets/${userId}/changePassword`, {
        redeemers,
        tx_id,
        pwd_id,
        tx
    })
    return response.data
}