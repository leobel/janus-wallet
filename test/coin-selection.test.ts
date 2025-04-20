import { coinSelection } from '../src/utils/coin-selection'
import { Assets, TxOutput, UTxO } from '@lucid-evolution/lucid'

const mkUtxo = (txHash: string, index: number, assets: Assets): UTxO => ({
  txHash,
  outputIndex: index,
  assets,
  address: 'addr_test',
})

const mkOutput = (address: string, assets: Assets): TxOutput => ({
  address,
  assets,
})

describe('coinSelection', () => {
  const changeAddress = 'addr_change'

  it('selects UTxOs for a simple ADA-only output', () => {
    const utxos = [
      mkUtxo('tx1', 0, { lovelace: 5_000_000n }),
      mkUtxo('tx2', 0, { lovelace: 3_000_000n }),
      mkUtxo('tx3', 0, { lovelace: 10_000_000n, 'token1': 1n }),
    ]

    const outputs = [mkOutput('addr1', { lovelace: 6_000_000n })]

    const result = coinSelection(utxos, outputs, changeAddress, 10)
    expect(result.inputs.length).toEqual(2)
    expect(result.outputs).toEqual(outputs)
    const totalInput = result.inputs.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n)
    const totalOutput = result.outputs.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n)
    const totalChange = result.change.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n)
    expect(totalInput - (totalOutput + totalChange)).toBe(0n)
  })

  it('selects UTxOs for a token-only output', () => {
    const utxos = [
      mkUtxo('tx1', 0, { lovelace: 1_000_000n, 'token1': 5n }),
      mkUtxo('tx2', 0, { lovelace: 1_000_000n, 'token1': 5n }),
      mkUtxo('tx3', 0, { lovelace: 3_000_000n }),
    ]

    const outputs = [mkOutput('addr1', { lovelace: 4_000_000n, 'token1': 8n })]

    const result = coinSelection(utxos, outputs, changeAddress, 10)
    expect(result.inputs.length).toEqual(3)
    expect(result.outputs).toEqual(outputs)

    const inputTokenSum = result.inputs.reduce((sum, utxo) => sum + (utxo.assets['token1'] || 0n), 0n)
    const changeTokenSum = result.change.reduce((sum, utxo) => sum + (utxo.assets['token1'] || 0n), 0n)
    const changeAdaSum = result.change.reduce((sum, utxo) => sum + (utxo.assets.lovelace || 0n), 0n)
    expect(inputTokenSum).toBeGreaterThanOrEqual(8n)
    expect(changeAdaSum).toEqual(1_000_000n)
    expect(changeTokenSum).toEqual(2n)
  })

  it('throws if not enough ADA', () => {
    const utxos = [mkUtxo('tx1', 0, { lovelace: 1_000_000n })]
    const outputs = [mkOutput('addr1', { lovelace: 2_000_000n })]

    expect(() => {
      coinSelection(utxos, outputs, changeAddress, 10)
    }).toThrow('InputsExhausted')
  })

  it('throws if not enough token', () => {
    const utxos = [
      mkUtxo('tx1', 0, { lovelace: 5_000_000n, 'token1': 2n }),
      mkUtxo('tx2', 0, { lovelace: 5_000_000n, 'token1': 1n }),
      mkUtxo('tx2', 0, { lovelace: 4_000_000n }),
    ]
    const outputs = [mkOutput('addr1', { lovelace: 3_000_000n, 'token1': 5n })]

    expect(() => {
      coinSelection(utxos, outputs, changeAddress, 10)
    }).toThrow('InputsExhausted: token1')
  })

  it('throws if input limit is exceeded', () => {
    const utxos = Array.from({ length: 20 }, (_, i) =>
      mkUtxo(`tx${i}`, 0, { lovelace: 1_000_000n })
    )
    const outputs = [mkOutput('addr1', { lovelace: 15_000_000n })]

    expect(() => {
      coinSelection(utxos, outputs, changeAddress, 5)
    }).toThrow('InputLimitExceeded')
  })

  it('handles multiple outputs correctly', () => {
    const utxos = [
      mkUtxo('tx1', 0, { lovelace: 5_000_000n, 'token1': 3n }),
      mkUtxo('tx2', 0, { lovelace: 6_000_000n }),
      mkUtxo('tx3', 0, { lovelace: 3_000_000n, 'token1': 2n }),
    ]

    const outputs = [
      mkOutput('addr1', { lovelace: 4_000_000n, 'token1': 2n }),
      mkOutput('addr2', { lovelace: 3_000_000n, 'token1': 1n }),
    ]

    const outputTokens = outputs.reduce((sum, output) => sum + (output.assets['token1'] || 0n), 0n)
    const outputAda = outputs.reduce((sum, output) => sum + (output.assets.lovelace || 0n), 0n)

    const result = coinSelection(utxos, outputs, changeAddress, 10)
    const inputTokens = result.inputs.reduce((sum, utxo) => sum + (utxo.assets['token1'] || 0n), 0n)
    const inputAda = result.inputs.reduce((sum, utxo) => sum + (utxo.assets.lovelace || 0n), 0n)
    const changeTokens = result.change.reduce((sum, utxo) => sum + (utxo.assets['token1'] || 0n), 0n)
    const changeAda = result.change.reduce((sum, utxo) => sum + (utxo.assets.lovelace || 0n), 0n)

    expect(result.inputs.length).toEqual(2)
    expect(result.outputs).toEqual(outputs)
    expect(inputTokens).toBeGreaterThanOrEqual(3n)
    expect(inputTokens - (outputTokens + changeTokens)).toEqual(0n)
    expect(inputAda - (outputAda + changeAda)).toEqual(0n)
  })
})
