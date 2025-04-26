import { Assets, CML, Data, fromText, Network, Script, TxOutput, UTxO } from '@lucid-evolution/lucid';
import { createUser, getUserById } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput, buildUncheckedTx, buildZKProofRedeemer, buildAllSpendRedeemers, mintAssetsTx } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';
import { coinSelection } from '../../utils/coin-selection.js';
import { getSignerKey, getSignerKeyHex } from './circuit.service.js';
import { AccountDatum, MintRedeemer } from '../../utils/contract-types.js';
import { getCircuit } from '../../repositories/circuit.repository.js';
import { randomUUID } from 'crypto';

const validators = readValidators();

function buildUserId(username: string): string {
    const tokenName = fromText(username)
    const userId = BigInt(`0x${tokenName}`).toString(16)
    return userId
}

export async function buildSpendTx(username: string, amount: number, receiveAddress: string, network: Network, assets: Assets): Promise<{tx: string, size: number}> {
    const tokenName = fromText(username)
    const userId = buildUserId(username)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }
    const { mint_utxo_ref, spend_script, spend_address: spendAddress, policy_id: policyId, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, lovelace , datum } = mint_utxo_ref
    
    // const { spend, spendAddress: walletAddress } = generateSpendScript(validators.spend.script, network, policyId, circuit.asset_name, tokenName, '')
    console.log('Janus wallet Address:', spendAddress);

    const assetUnit = `${policyId}${tokenName}`;
    console.log("AssetUnit", assetUnit)
    const utxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: { lovelace: BigInt(lovelace), [assetUnit]: BigInt(1) },
        datum
    }
    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

    const zkInput: ZkInput = {
        userId: userId,
        hash: user.pwd_hash,
        // pwd: "12345"
    }

    const lucid = await getLucid;

    const utxos = (await lucid.utxosAt(spendAddress))
    // console.log('Wallet UTXOs:', utxos);
    const reqLovelace = BigInt(amount)
    const outputs: TxOutput[] = [{ address: receiveAddress, assets: {...assets, lovelace: reqLovelace }}] 
    const { inputs } = coinSelection(utxos, outputs, spendAddress)
    console.log("Coin Selection Inputs:", inputs)
    console.log("Coin Selection Inputs:", inputs.length)
    const tx = await buildUncheckedTx(lucid, [utxoRef], inputs, spendAddress, spend_script as Script, reqLovelace, validTo, receiveAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex(), size: inputs.length}
}

export async function generateRedeemer(username: string, pwd: string, txCbor: string, size: number): Promise<string[]> {
    const userId = buildUserId(username)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const zkInput: ZkInput = {
        userId: userId,
        hash: user.pwd_hash,
        pwd
        // pwd: "12345"
    }
    const redeemer = await buildZKProofRedeemer(txCbor, zkInput, 0, 0, 0)
    return buildAllSpendRedeemers(redeemer, size)
}

export async function spendWalletFunds(username: string, redeemers: string[], txCbor: string) {
    const userId = buildUserId(username)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const lucid = await getLucid;
    const txId = await spendTx(lucid, redeemers, txCbor);

    return txId;
};


export async function createAccountTx(username: string, network: Network, hash: string, nonce?: string) {
    const circuit = await getCircuit();
    if (!circuit) {
        throw new Error('Circuit not found')
    }
    const { mint_script, policy_id, asset_name } = circuit

    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(getSignerKeyHex());
    const walletAddress = await lucid.wallet().address();
    
    const addrNonce = fromText(nonce || randomUUID())
    const tokenName = fromText(username);
    const _datum: AccountDatum = {
        user_id: tokenName,
        hash,
        nonce: addrNonce
    }
    const datum = Data.to(_datum, AccountDatum);
    console.log('Datum', datum);

    const mintRedeemer: MintRedeemer = "CreateAccount";
    const { spend, spendAddress } = generateSpendScript(validators.spend.script, network, policy_id, asset_name, tokenName, addrNonce)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const utxoRef = await mintAssetsTx(lucid, datum, mintRedeemer, tokenName, walletAddress, mint_script as Script, policy_id, spendAddress, validTo, { localUPLCEval: true })
    await createUser({
        user_id: tokenName,
        pwd_hash: hash,
        spend_address: spendAddress,
        policy_id: policy_id,
        nonce: addrNonce,
        spend_script: spend,
        mint_utxo_ref: {
            tx_hash: utxoRef.txId,
            output_index: utxoRef.index,
            lovelace: Number(utxoRef.lovelace),
            datum
        }
    })
    return utxoRef
}

