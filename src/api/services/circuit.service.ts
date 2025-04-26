import { CML, Data, fromText, Network, TxOutput } from "@lucid-evolution/lucid";
import { generateMintPolicy, getMinAda, mintAssetsTx, readValidators } from "../../utils/prepare-contracts";
import { getLucid } from '../../utils/index.js';
import * as fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import { MintRedeemer, ZkVerificationKey } from "../../utils/contract-types";


// Convert import.meta.url to __dirname-like path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const prvKey = fs.readFileSync(path.resolve(__dirname, '../../me.sk')).toString();
const prvKey = process.env.PRV_KEY!
const privateKey = CML.PrivateKey.from_bech32(prvKey)

const validators = readValidators()

export function getSignerKeyHex() {
    return prvKey
}

export function getSignerKey() {
    return privateKey
}

export async function mintCircuit(network: Network, tokenName: string, circuit: any, version: number, nonce: string) {
    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(prvKey);
    const walletAddress = await lucid.wallet().address();

    const hexTokenName = fromText(tokenName);
    const datum = Data.to(circuit, ZkVerificationKey);
    console.log('Datum', datum);

    const mintRedeemer: MintRedeemer = "CreateCircuit";

    const { mint, policyId, mintAddress } = generateMintPolicy(network, validators.mint.script, walletAddress, version, nonce);

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const utxoRef = await mintAssetsTx(lucid, datum, mintRedeemer, hexTokenName, walletAddress, mint, policyId, mintAddress, validTo, { localUPLCEval: true })
    return utxoRef
}

