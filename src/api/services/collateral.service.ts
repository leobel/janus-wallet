import { UTxO } from "@lucid-evolution/lucid";
import { Wallet } from "@lucid-evolution/lucid";
import { TxBuilderConfig, CML } from "@lucid-evolution/lucid";
import { getLucid } from "../../utils";
import * as fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';


// Convert import.meta.url to __dirname-like path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const prvKey = fs.readFileSync(path.resolve(__dirname, '../../me.sk')).toString();
// console.log("Wallet prv key:", Buffer.from(CML.PrivateKey.from_bech32(prvKey).to_raw_bytes()).toString("hex"))


const collateralPrvKey = process.env.COLLATERAL_PRV_KEY!
const collateralAddress = process.env.COLLATERAL_ADDRESS!
const collateralUtxoTxId = process.env.COLLATERAL_UTXO_TX_ID!
const collateralUtxoTxIndex = Number(process.env.COLLATERAL_UTXO_TX_INDEX!)
const collateralUtxoTxAmount = BigInt(process.env.COLLATERAL_UTXO_TX_AMOUNT!)
const privateKey = CML.PrivateKey.from_bech32(collateralPrvKey)

export function getCollaterls(config: TxBuilderConfig): Promise<{address: string, inputs: UTxO[]}> {
    // TODO: this should be a service handling their own list of UTxOs and returning the list of collaterals necessary to cover the tx costs
    return Promise.resolve({
        address: collateralAddress,
        inputs: [
            {
                address: collateralAddress,
                txHash: collateralUtxoTxId,
                outputIndex: collateralUtxoTxIndex,
                assets: {
                    "lovelace": collateralUtxoTxAmount
                }
            }
        ]
    })
}

// TODO: make sure tx collaterals have collaterals provided by this service
export function signCollateral(txBody: CML.TransactionBody): CML.Vkeywitness {
    const txBodyHash = CML.hash_transaction(txBody)
    return CML.make_vkey_witness(txBodyHash, privateKey)
}
