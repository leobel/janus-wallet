import { assetsToValue, CML, Data, fromHex, type Cardano, type WalletApi, type Assets, Lucid, Blockfrost, type Network, fromText, type UTxO } from "@lucid-evolution/lucid"
import AssetFingerprint from '@emurgo/cip14-js'

// declare global {
//     interface Window {
//         cardano: Cardano
//     }
// }

const AccountDatumSchema = Data.Object({
    user_id: Data.Bytes(),
    hash: Data.Bytes(),
    nonce: Data.Bytes(),
})
type AccountDatum = Data.Static<typeof AccountDatumSchema>
const AccountDatum = AccountDatumSchema as unknown as AccountDatum

export const CARDANO_NETWORK = import.meta.env.VITE_CARDANO_NETWORK
export const TRANSACTION_MAX_FEE = Number(import.meta.env.VITE_TRANSACTION_MAX_FEE)
export const COINS_PER_UTXO_BYTE = BigInt(import.meta.env.VITE_COINS_PER_UTXO_BYTE)
export const CIRCUIT_POLICY = import.meta.env.VITE_CIRCUIT_POLICY
export const CIRCUIT_ASSET_NAME = import.meta.env.VITE_CIRCUIT_ASSET_NAME
export const FAKE_USER_NONCE = import.meta.env.VITE_FAKE_USER_NONCE
export const FAKE_USER_PWD_HASH = import.meta.env.VITE_FAKE_USER_PWD_HASH
export const FAKE_USER_ADDRESS = import.meta.env.VITE_FAKE_USER_ADDRESS

export interface SupportedWallet {
    name: string
    code: string
    src?: string
    homepage?: string
    icon?: string
    extensionId?: string
}

export interface Wallet {
    api: WalletApi
    code: string
}

export const wallets: SupportedWallet[] = [
    {
        "name": "VESPR",
        "code": "vespr",
    },
    {
        "name": "Lace",
        "code": "lace"
    },
    {
        "name": "Eternl",
        "code": "eternl"
    },
    {
        "name": "Nami",
        "code": "nami"
    },

]

export function getSupportedWallets(): SupportedWallet[] {
    return wallets.filter(w => window.cardano[w.code]).map(w => ({ ...w, src: window.cardano[w.code].icon }))
}

export async function openWallet(wallet: SupportedWallet): Promise<WalletApi> {
    // const enable = await isEnable(wallet.code)
    // if (!enable) {
    //     throw new Error(`Wallet: ${wallet.code} is not enable`)
    //     //show connecting wallet UI
    //     // this.closePaymentOptionsView()
    //     // this.openWalletConnectingView(option)
    // }
    try {
        const api = await open(wallet.code)
        if (!api) {
            throw new Error(`cannot open wallet: ${wallet.code}`)
        }
        return api
    } catch (err) {
        throw err
    }
}

export async function checkWalletNetwork(api: WalletApi): Promise<boolean> {
    const networkId = await api.getNetworkId()
    if ((networkId !== 1 && CARDANO_NETWORK === 'Mainnet') || (networkId !== 0 && (CARDANO_NETWORK === 'Preprod' || CARDANO_NETWORK === 'Preview'))) {
        return false
    }
    return true
}

export async function getMintAccountPrice(api: WalletApi, username: string): Promise<number> {
    const value = CML.Value.from_cbor_hex(await api.getBalance())
    const balance = Number(value.coin())
    let assets = null
    if (value.has_multiassets()) {
        assets = mapAssets(value.multi_asset())
    }

    // const mAssets = assets ? mapAssetsToTokens(assets, 'concat') : {}
    // mAssets['lovelace'] = balance

    const tokenName = fromText(username)
    const _datum: AccountDatum = {
        user_id: tokenName,
        hash: FAKE_USER_PWD_HASH, // bcrypt.hash(...)
        nonce: FAKE_USER_NONCE
    }
    const datum = Data.to(_datum, AccountDatum)
    console.log('Datum', datum)

    const minAda = getMinAda({ [`${CIRCUIT_POLICY}${tokenName}`]: 1n }, COINS_PER_UTXO_BYTE, FAKE_USER_ADDRESS, datum)
    const price = TRANSACTION_MAX_FEE + minAda
    console.log('MIN ADA:', minAda)
    console.log('Wallet ADA:', balance)
    console.log('Wallet Assets:', assets)
    // console.log('Mapped Assets:', mAssets)
    if (price > balance) {
        throw new Error('not enough funds')
    }
    return price
}

export async function getWalletFunds(api: WalletApi, price: number): Promise<{ utxos: string[], changeAddress: string }> {
    try {
        const { ok, outputs } = await getUtxos(api, price, price)
        if (ok) {
            const changeAddress = await getChangeAddress(api)
            return { utxos: outputs, changeAddress }
        }
        else {
            // try with all wallet balance
            const { ok, outputs } = await getUtxos(api, price)
            if (ok) {
                const changeAddress = await getChangeAddress(api)
                return { utxos: outputs, changeAddress }
            }
        }
    } catch (error) {
        console.log('getting utxos error:', error)
        // try with all wallet balance
        const { ok, outputs } = await getUtxos(api, price)
        if (ok) {
            const changeAddress = await getChangeAddress(api)
            return { utxos: outputs, changeAddress }
        }
    }
    throw new Error('not enough funds')
}

export async function walletSignTx(api: WalletApi, cborTx: string, isPartial = true): Promise<string> {
    return api.signTx(cborTx, isPartial)
}

// get base32 address string
async function getChangeAddress(api: WalletApi): Promise<string> {
    const changeAddress = await api.getChangeAddress()
    if (changeAddress.startsWith('addr')) {
        return changeAddress
    }

    return CML.Address.from_hex(changeAddress).to_bech32()
}

async function getUtxos(api: WalletApi, price: number, amount?: number) {
    const { cborAmount, paginate } = amount
        ? {
            cborAmount: assetsToValue({ "lovelace": BigInt(amount) }).to_cbor_hex(),
            paginate: { page: 0, limit: 20 }
        } : {
            cborAmount: undefined,
            paginate: { page: 0, limit: 20 }
        }
    const result = []
    const pages: string[] = []
    let balance = 0
    console.log('Amount:', amount)
    console.log('Cbor Amount:', cborAmount)
    console.log('Price:', price)

    // we're going to use underlying api since @lucid-evolution/lucid isn't providing getUtxos(amount, paginate) as in CIP30
    const realApi = api as any
    while (true) {
        const utxos = (await realApi.getUtxos(cborAmount, paginate)) as string[] // return Promise<TransactionUnspentOutput[] | null>
        // console.log('utxos:', utxos)
        if (!utxos || utxos.length == 0 || utxos.every(utxo => pages.some(r => r == utxo))) {
            break
        }
        pages.push(...utxos)
        const outputs = filterUtxos(utxos, COINS_PER_UTXO_BYTE).sort((a, b) => b.amount - a.amount)
        // console.log('Filter UTxOs:', outputs)
        for (const { amount, utxo } of outputs) {
            balance += amount
            result.push(utxo)
            if (balance >= price) {
                // console.log('return here')
                return { ok: true, outputs: result }
            }
        }
        paginate.page += 1
    }
    return { ok: false, outputs: result }
}

function filterUtxos(utxos: string[], utxoCostPerByte: bigint): { amount: number, utxo: string }[] {
    const wUtxos = utxos.map(utxo => {
        const input = CML.TransactionUnspentOutput.from_cbor_hex(utxo)
        const multiasset = input.output().amount().multi_asset()
        const amount = Number(input.output().amount().coin())
        if (!multiasset || multiasset.policy_count() == 0) {
            return { amount, utxo, assets: [] }
        }

        //check if we can "extract" something from UTxO holding assets (e.g current amount of ADA is bigger than minimum required)
        const inputAssets = mapFlatAssets(multiasset) as Assets
        // discount min ada for assets
        const addr = input.output().address().to_bech32()
        const datum = input.output().datum()?.as_datum()?.to_cbor_hex()
        const minAda = getMinAda(inputAssets, utxoCostPerByte, addr, datum)
        const remaining = amount - minAda
        return { amount: remaining, utxo }
    })
    return wUtxos.filter(i => i.amount > 0)
}


async function isEnable(wallet: string): Promise<boolean> {
    return window.cardano[wallet].isEnabled()
}

async function open(walletCode: string): Promise<WalletApi | undefined> {
    try {
        const api = await window.cardano[walletCode].enable()
        return api
    } catch (error) {
        return
    }
}

function getMinAda(assets: Assets, coinsPerUtxoByte: bigint, changeAddress?: string, datum?: string) {
    const minAda = calculateMinLovelace(coinsPerUtxoByte, assets, changeAddress, datum)
    return Number(minAda)
}

function calculateMinLovelace(
    coinsPerUtxoByte: bigint,
    multiAssets?: Assets,
    changeAddress?: string,
    datum?: string,
) {
    let outputBuilder = CML.TransactionOutputBuilder.new()
        .with_address(
            CML.Address.from_bech32(changeAddress ? changeAddress : FAKE_USER_ADDRESS),
        )
    if (datum) {
        outputBuilder = outputBuilder.with_data(CML.DatumOption.new_datum(CML.PlutusData.from_cbor_hex(datum)))
    }
    return outputBuilder.next()
        .with_asset_and_min_required_coin(
            multiAssets
                ? assetsToValue(multiAssets).multi_asset()
                : CML.MultiAsset.new(),
            coinsPerUtxoByte,
        )
        .build()
        .output()
        .amount()
        .coin()
}

function mapAssets(multiAssets: CML.MultiAsset): Record<string, Record<string, number>> {
    let result: Record<string, Record<string, number>> = {}
    const policies = multiAssets.keys()
    for (let i = 0; i < policies.len(); i++) {
        const policy = policies.get(i)
        const policyId = policy.to_hex()
        if (result[policyId]) {
            result[policyId] = {}
        }
        const policyAssets = multiAssets.get_assets(policy)!
        const assets = policyAssets.keys()
        for (let j = 0; j < assets.len(); j++) {
            const asset = assets.get(j)
            const assetName = asset.to_hex()
            const amount = Number(policyAssets.get(asset)!)
            result[policyId][assetName] = (result[policyId][assetName] || 0) + amount
        }
    }

    return result
}

function mapFlatAssets(multiAssets: CML.MultiAsset): Record<string, bigint> {
    let result: Record<string, bigint> = {}
    const policies = multiAssets.keys()
    for (let i = 0; i < policies.len(); i++) {
        const policy = policies.get(i)
        const policyId = policy.to_hex()
        const policyAssets = multiAssets.get_assets(policy)!
        const assets = policyAssets.keys()
        for (let j = 0; j < assets.len(); j++) {
            const asset = assets.get(j)
            const assetName = asset.to_hex()
            const amount = policyAssets.get(asset)!
            result[policyId + assetName] = (result[policyId + assetName] || 0n) + amount
        }
    }

    return result
}

function mapAssetsToTokens(assets: Record<string, Record<string, number>>, encode = 'fingerprint'): Record<string, number> {
    if (encode == 'fingerprint') {
        return Object.entries(assets).reduce((dict, [policy, tokens]) => {
            const policyTokens = Object.entries(tokens).reduce((acc, [assetName, quantity]) => {
                const id = AssetFingerprint.fromParts(fromHex(policy), fromHex(assetName)).fingerprint()
                acc[id] = (acc[id] || 0) + quantity
                return acc
            }, {} as Record<string, number>)
            return { ...dict, ...policyTokens }
        }, {})
    } else {
        return Object.entries(assets).reduce((dict, [policy, tokens]) => {
            const policyTokens = Object.entries(tokens).reduce((acc, [assetName, quantity]) => {
                const id = `${policy}${assetName}`
                acc[id] = (acc[id] || 0) + quantity
                return acc
            }, {} as Record<string, number>)
            return { ...dict, ...policyTokens }
        }, {})
    }
}

export function getLucid(url: string, apiKey: string, network: string) {
    return async function () {
        const lucid = await Lucid(
            new Blockfrost(url, apiKey),
            network as Network
        )
        return lucid
    }
}