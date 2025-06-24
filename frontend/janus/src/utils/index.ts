import { CML } from "@lucid-evolution/lucid"
import { mapFlatAssets } from "./walletApi"
import type { TransactionFees } from "../models/fees"
import type { Drep, DrepType, FixedDrepType } from "../models/drep"

export const Lovelace = 1_000_000

export function toLovelace(num: number): number {
    return Math.floor(num * Lovelace)
}

export function fromLovelace(num: number): number {
    return num / Lovelace
}

export function calculateFees(cborTx: string, assets?: Record<string, number>): TransactionFees {
    const tx = CML.Transaction.from_cbor_hex(cborTx)
    const txFee = Number(tx.body().fee())
    const assetsFee = assets ? getAssetsFee(tx, assets) : 0
    return { txFee, assetsFee }
}

export function getDrepImg(drep: Drep): string | undefined {
    const image = drep?.json_metadata?.body?.image?.contentUrl
    if (typeof image === 'object') {
        return image["@value"]
    }
    return image
}

export function getDrepName(drep: Drep): string | undefined {
    const name = drep?.json_metadata?.body?.givenName
    if (typeof name === 'object') {
        return name["@value"]
    }
    return name
}

export function isDrepFixed(type: DrepType): type is FixedDrepType {
    return type === "AlwaysAbstain" || type === "AlwaysNoConfidence"
}

export function buildAlwaysAbstainDrep(): Drep {
    return { 
        drep_id: "", 
        hex: "AlwaysAbstain", 
        is_always_abstain: true, 
        json_metadata: {
            body: {
                givenName: "Always Abstain" 
            } 
        } 
    }
}

export function buildAlwaysNoConfidenceDrep(): Drep {
    return { 
        drep_id: "", 
        hex: "AlwaysNoConfidence", 
        is_always_non_confindence: true, 
        json_metadata: {
            body: {
                givenName: "Always No Confidence" 
            } 
        } 
    }
}

function getAssetsFee(tx: CML.Transaction, assets: Record<string, number>): number {
    let assetFees = 0
    const body = tx.body()
    const utxos = body.outputs()
    for (let i = 0; i < utxos.len(); i++) {
        const utxo = utxos.get(i);
        const multiasset = utxo.amount().multi_asset()
        if (!multiasset || multiasset.policy_count() == 0 || Object.keys(mapFlatAssets(multiasset)).every(key => !assets[key])) {
            continue
        }
        assetFees += Number(utxo.amount().coin())
    }
    return assetFees
}

export function mergeAssets(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    return Object.entries(b).reduce((acc, [key, value]) => ({ ...acc, [key]: (acc[key] || 0) + value }), a)
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
