import { CML, Data, fromText, getAddressDetails, Network, TxOutput } from "@lucid-evolution/lucid";
import { generateMintPolicy, getMinAda, buildMintAssetsUnsignedTx, readValidators } from "../../utils/prepare-contracts";
import { getLucid } from '../../utils/index.js';
import * as fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import { MintRedeemer, ZkVerificationKey as OnChainZkVerificationKey } from "../../utils/contract-types";
import { randomUUID } from 'crypto';
import { createCircuit } from "../../repositories/circuit.repository";
import { ZkVerificationKey } from "../../models/zk-verification_key";


// Convert import.meta.url to __dirname-like path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const prvKey = fs.readFileSync(path.resolve(__dirname, '../../me.sk')).toString();
const prvKey = process.env.WALLET_PRV_KEY!
const privateKey = CML.PrivateKey.from_bech32(prvKey)

const validators = readValidators()

export function getSignerKeyHex() {
    return prvKey
}

export function getSignerKey() {
    return privateKey
}

export async function mintCircuit(network: Network, tokenName: string, circuitVerificationKey: ZkVerificationKey, version: number, nonce: string) {
    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(prvKey);
    const walletAddress = await lucid.wallet().address();

    const assetName = fromText(tokenName);
    const datum = Data.to(circuitVerificationKey, OnChainZkVerificationKey);
    console.log('Datum', datum);

    const mintRedeemer: MintRedeemer = "CreateCircuit";
    const circuitNonce = fromText(nonce || randomUUID())
    const signerKey = getAddressDetails(walletAddress).paymentCredential!.hash
    const { mint, policyId, mintAddress } = generateMintPolicy(network, validators.mint.script, signerKey, version, circuitNonce);

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const utxos = (await lucid.utxosAt(walletAddress))
    const { utxoRef, cborTx} = await buildMintAssetsUnsignedTx(utxos, lucid, datum, mintRedeemer, assetName, walletAddress, mint, policyId, mintAddress, validTo, [signerKey], [privateKey],{ localUPLCEval: true })

    // submit transaction
    const provider = lucid.config().provider!
    const txHash = await provider.submitTx(cborTx)
    console.log('Tx Id (Submit):', txHash);

    await createCircuit({
        version: version,
        signer_key: signerKey,
        nonce: circuitNonce,
        policy_id: policyId,
        asset_name: assetName,
        mint_address: mintAddress,
        mint_utxo_ref: utxoRef,
        mint_script: mint,
        zk_verification_key: circuitVerificationKey
    })
    return utxoRef
}

