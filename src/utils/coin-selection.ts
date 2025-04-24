import { UTxO, TxOutput, Assets } from '@lucid-evolution/lucid'

type TokensOnly = Omit<Assets, "lovelace">

// Tests showed that at least 50 inputs can be included, although it could be more (~85) if exUnits doesn't increase on each bypass script execution
// Each bypass script execution is increasing exUnits because `list.at` is essentially a recursive func iterating over the collection until reaching the index (https://github.com/aiken-lang/stdlib/blob/2.2.0/lib/aiken/collection/list.ak#L133-L143).
// There is a CIP to inlcude arrays to Plutus Core so look ups can be constant time O(1) see here: https://cips.cardano.org/cip/CIP-0138
const COIN_SELECTION_INPUTS_LIMIT = 50

interface CoinSelectionResult {
  inputs: UTxO[]
  outputs: TxOutput[]
  change: TxOutput[]
}

function addAssets(a: Assets, b: Assets): Assets {
  return Object.entries(b).reduce((r, [unit, qty]) => ({...r, [unit]: (r[unit] || 0n) + qty})
  , { ...a })
}

function subtractAssets(a: Assets, b: Assets): Assets {
    return Object.entries(b).reduce((r, [unit, qty]) => {
        const rem = (r[unit] || 0n) - qty
        if (rem > 0n) {
            r[unit] = rem
        } else {
            delete r[unit]
        }
        return r
    }, { ...a })
}

function splitUtxos(utxos: UTxO[]): {adaOnly: UTxO[], multiToken: UTxO[]} {
    const adaOnly: UTxO[] = []
    const multiToken: UTxO[] = []
    for (let utxo of utxos) {
        if (Object.keys(utxo.assets).length > 1) {
            multiToken.push(utxo)
        } else {
            adaOnly.push(utxo)
        }
    }
    return { adaOnly, multiToken }
}

function selectTokens(required: TokensOnly, utxos: UTxO[], limit: number): { assets: Assets, selection: UTxO[], remaining: UTxO[] } {
    let utxosAvailable = [...utxos]
    const selection: UTxO[] = []
    const assets: Assets = { lovelace: 0n }
    for (const [unit, qty] of Object.entries(required)) {
        assets[unit] = 0n
        let idx = 0
        while (assets[unit] < qty && idx < utxosAvailable.length) {
            const utxo = utxosAvailable[idx]
            if (utxo.assets?.[unit] > 0) {
                assets[unit] += utxo.assets[unit]
                selection.push(utxo)
                if (selection.length > limit) {
                    throw new Error('InputLimitExceeded')
                }
                utxosAvailable.splice(idx, 1)
            } else {
                idx++
            }
        }
        
        if (assets[unit] < qty) {
            throw new Error(`InputsExhausted: ${unit}`)
        }
    }
    assets.lovelace = selection.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n)
    return { assets, selection, remaining: utxosAvailable }
}

// Javascript implementation of coin selection algorithm Random-Improve (https://cips.cardano.org/cip/CIP-2#random-improve)
export function coinSelection(
  utxos: UTxO[],
  reqOutputs: TxOutput[],
  changeAddress: string,
  limit = COIN_SELECTION_INPUTS_LIMIT
): CoinSelectionResult {
    let { adaOnly: utxosAvailable, multiToken } = splitUtxos(utxos)
    // phase 1: Random Selection
  const phase1: { output: TxOutput, selection: UTxO[], assets: Assets }[] =
    reqOutputs
      .slice()
      .sort((a, b) => Number(b.assets.lovelace - a.assets.lovelace)) // sort in descending order
      .map((output) => {
        const selection: UTxO[] = []
        let total: Assets = { lovelace: 0n }
        const { lovelace, ...tokens } = output.assets

        // select utxos for tokens requested
        if (Object.keys(tokens).length > 0) {
            if (multiToken.length === 0) {
                throw new Error('InputsExhausted')
            }
            const { assets, selection: sel, remaining } = selectTokens(tokens, multiToken, limit)
            total = addAssets(total, assets)
            selection.push(...sel)
            if (selection.length > limit) {
                throw new Error('InputLimitExceeded')
            }
            multiToken = remaining
        }

        // keep until ADA is covered
        while (total.lovelace < lovelace) {
          if (utxosAvailable.length === 0) {
            throw new Error('InputsExhausted')
          }
          const idx = Math.floor(Math.random() * utxosAvailable.length)
          const utxo = utxosAvailable[idx]
          selection.push(utxo)
          if (selection.length > limit) {
            throw new Error('InputLimitExceeded')
          }
          total = addAssets(total, utxo.assets)
          utxosAvailable.splice(idx, 1)
        }
        return { output, selection, assets: total }
      })

  const inputs: UTxO[] = []
  const change: TxOutput[] = []

  // phase 2: Improvement
  for (let { output, selection, assets: tot } of phase1.sort((a, b) => Number(a.output.assets.lovelace - b.output.assets.lovelace))) {
    // sum selected assets
    // let tot: Assets = selection.reduce((acc, u) => addAssets(acc, u.assets), { lovelace: 0n } as Assets)
    if (inputs.length + selection.length > limit) {
        throw new Error('InputLimitExceeded')
    }
    const v = Number(output.assets.lovelace)
    const ideal = 2 * v
    const max = 3 * v
    let improved = true
    while (improved && utxosAvailable.length > 0) {
      const currLovelace = Number(tot.lovelace)
      improved = false
      const idx = Math.floor(Math.random() * utxosAvailable.length)
      const utxo = utxosAvailable[idx]
      const newAda = currLovelace + Number(utxo.assets.lovelace)

      const currDiff = Math.abs(currLovelace - ideal) // tot.lovelace > ideal ? tot.lovelace - ideal : ideal - tot.lovelace
      const newDiff = Math.abs(newAda - ideal) // newAda > ideal ? newAda - ideal : ideal - newAda
      if (newAda <= max && newDiff < currDiff && inputs.length + selection.length + 1 <= limit) {
        selection.push(utxo)
        tot = addAssets(tot, utxo.assets)
        utxosAvailable.splice(idx, 1)
        improved = true
      }
    }

    inputs.push(...selection)
    change.push({
      address: changeAddress,
      assets: subtractAssets(tot, output.assets),
    })
  }

  return { inputs: sortInputs(inputs), outputs: reqOutputs, change }
}

// Inputs are ordered first by txHash and then by outputIndex, this rule comes from the Ledger itself.
function sortInputs(inputs: UTxO[]): UTxO[] {
  return inputs.sort((a, b) => {
      if (a.txHash == b.txHash) {
        return a.outputIndex - b.outputIndex
      } else {
        return a.txHash.localeCompare(b.txHash)
      }
  })
}
