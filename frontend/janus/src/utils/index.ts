import { CML } from "@lucid-evolution/lucid"
import { mapFlatAssets } from "./walletApi"
import type { TransactionFees } from "../models/fees"

export const Lovelace = 1_000_000

const feeAlgo = CML.LinearFee.new(
    BigInt(44),
    BigInt(155381),
    BigInt(15),
)

const exUnitsPrices = CML.ExUnitPrices.new(
    CML.Rational.new(
        BigInt(0.0577 * 100_000_000),
        100_000_000n,
    ),
    CML.Rational.new(
        BigInt(0.0000721 * 100_000_000),
        100_000_000n,
    ),
)

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
    return {txFee, assetsFee}
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

function mergeAssets(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    return Object.entries(b).reduce((acc, [key, value]) => ({...acc, [key]: (acc[key] || 0) + value}), a)
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
