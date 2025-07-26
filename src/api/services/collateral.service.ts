import { UTxO, type LucidEvolution } from "@lucid-evolution/lucid";
import { TxBuilderConfig, CML } from "@lucid-evolution/lucid";
import { getLucid } from "../../utils";

let utxos: UTxO[]
let index = 0
const collateralPrvKey = process.env.COLLATERAL_PRV_KEY!
const collateralAddress = process.env.COLLATERAL_ADDRESS!
const privateKey = CML.PrivateKey.from_bech32(collateralPrvKey)

export async function initCollaterals() {
    if (!utxos) {
        const lucid = await getLucid;
        utxos = await lucid.utxosAt(collateralAddress)
    }
}

export function getCollaterls(config: TxBuilderConfig): Promise<{ address: string, inputs: UTxO[] }> {
    // TODO: this should be a service handling their own list of UTxOs and returning the list of collaterals necessary to cover the tx costs
    const utxo = utxos[index]
    index = (index + 1) % utxos.length
    return Promise.resolve({
        address: utxo.address,
        inputs: [
            {
                address: utxo.address,
                txHash: utxo.txHash,
                outputIndex: utxo.outputIndex,
                assets: utxo.assets
            }
        ]
    })
}

// TODO: make sure tx collaterals have collaterals provided by this service
export function signCollateral(txBody: CML.TransactionBody): CML.Vkeywitness {
    const txBodyHash = CML.hash_transaction(txBody)
    return CML.make_vkey_witness(txBodyHash, privateKey)
}
