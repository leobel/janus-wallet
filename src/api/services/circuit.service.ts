import { CML, fromText, Network, TxOutput } from "@lucid-evolution/lucid";
import { generateMintPolicy, getMinAda, mintCircuitTx, readValidators } from "../../utils/prepare-contracts";
import { getLucid } from '../../utils/index.js';
import * as fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';


// Convert import.meta.url to __dirname-like path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prvKey = fs.readFileSync(path.resolve(__dirname, '../../me.sk')).toString();
const privateKey = CML.PrivateKey.from_bech32(prvKey)

export function getSignerKey() {
    return privateKey
}

export async function mintCircuit(network: Network, tokenName: string, circuit: any, version: number, nonce: string) {
    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(prvKey);
    const walletAddress = await lucid.wallet().address();

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const txId = await mintCircuitTx(lucid, network, circuit, tokenName, walletAddress, version, validTo, nonce, { localUPLCEval: true })
    return { txId }
}

