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

const prvKey = fs.readFileSync(path.resolve(__dirname, '../../me.sk')).toString();
const privateKey = CML.PrivateKey.from_bech32(prvKey)

export function getCollaterls(config: TxBuilderConfig): Promise<{address: string, inputs: UTxO[]}> {
    // TODO: this should be a service handling their own list of UTxOs and returning the list of collaterals necessary to cover the tx costs
    return Promise.resolve({
        address: "addr_test1vq7uu7zy7d4j8wxrly90hfq25xyw0uwn7m52e5w4gnk3m2gprf2za",
        inputs: [
            {
                address: "addr_test1vq7uu7zy7d4j8wxrly90hfq25xyw0uwn7m52e5w4gnk3m2gprf2za",
                txHash: "d6da036c1aeb7680323258c763a2a6e25be9b280c2a8fedd5e43cb89730fdadf",
                outputIndex: 1,
                assets: {
                    "lovelace": 9937292408n
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


// TODO: this func is a **copy** from Lucid-Evolution, we should create a PR to expose and use it directly
async function getWalletInfo(config: TxBuilderConfig): Promise<{ wallet: Wallet, address: string, inputs: UTxO[] }> {
    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(prvKey);
    const wallet = lucid.wallet();
    const address = await wallet.address();
    const inputs = config.walletInputs.length == 0 ? await wallet.getUtxos() : config.walletInputs;
    return {
        wallet,
        address,
        inputs
    }
}