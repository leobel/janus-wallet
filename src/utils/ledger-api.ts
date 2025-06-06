import 'dotenv/config';
import axios from "axios";
import type { AccountBalance } from '../models/account-balance';
import type { AddressTotalResponse } from '../models/ledger/address-total';
import type { StakePool } from '../models/ledger/stake-pool';
import type { StakeInfo } from '../models/ledger/stake-info';

const axiosInstance = axios.create({
    baseURL: process.env.BLOCKFROST_API_URL!,
    headers: { 
        'Content-Type': 'application/json',
        'project_id': process.env.BLOCKFROST_API_KEY!
     },
    withCredentials: true
})

export async function getLedgerAccountBalance(address: string): Promise<AccountBalance> {
    const response = await axiosInstance.get<AddressTotalResponse>(`addresses/${address}/total`)
    const total = response.data
    const lovelaceReceived = total.received_sum.filter(s => s.unit == "lovelace").map(s => BigInt(s.quantity)).reduce((q, acc) => acc + q, BigInt(0))
    const lovelaceSent = total.sent_sum.filter(s => s.unit == "lovelace").map(s => BigInt(s.quantity)).reduce((q, acc) => acc + q, BigInt(0))
    const assetsReceived = total.received_sum.filter(s => s.unit != "lovelace").reduce((acc, asset) => {
        if (!acc[asset.unit]) {
            acc[asset.unit] = BigInt(0)
        }
        acc[asset.unit] += BigInt(asset.quantity)
        return acc
    }, {} as Record<string, bigint>)
    const assetsSent = total.sent_sum.filter(s => s.unit != "lovelace").reduce((acc, asset) => {
        if (!acc[asset.unit]) {
            acc[asset.unit] = BigInt(0)
        }
        acc[asset.unit] = acc[asset.unit] + BigInt(asset.quantity)
        return acc
    }, {} as Record<string, bigint>)

    const assets = Object.entries(assetsSent).reduce((acc, [unit, quantity]) => {
        if (acc[unit]) {
            acc[unit] = acc[unit] - BigInt(quantity)
            if (acc[unit] === BigInt(0)) {
                delete acc[unit]
            }
        }
        return acc
    }, assetsReceived)

    return {
        lovelace: lovelaceReceived - lovelaceSent,
        assets: assets,
        tx_count: Number(total.tx_count)
    }
    
}

export async function tokenExist(policyId: string, assetName: string): Promise<boolean> {
    try {
        const unit = `${policyId+assetName}`;
        await axiosInstance.get(`assets/${unit}`)
        return true
    } catch {
        return false
    }
}

export async function getStakePools(count: number, page: number): Promise<StakePool[]> {
    const response = await axiosInstance.get(`pools/extended?count=${count}&page=${page}`)
    return response.data
}

export async function getStakeInfo(stakeAddress: string): Promise<StakeInfo> {
    const response = await axiosInstance.get(`accounts/${stakeAddress}`)
    return response.data
}