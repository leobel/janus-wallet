import { Assets, fromText, Network, TxOutput, UTxO } from '@lucid-evolution/lucid';
import { getUserById } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput, buildUncheckedTx, buildZKProofRedeemer } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';
import { coinSelection } from '../../utils/coin-selection.js';

const validators = readValidators();

function buildUserId(username: string): string {
    const tokenName = fromText(username)
    const userId = BigInt(`0x${tokenName}`).toString(16)
    return userId
}

export async function buildSpendTx(username: string, amount: number, receiveAddress: string, network: Network, assets: Assets) {
    const tokenName = fromText(username)
    const userId = buildUserId(username)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const { zk_verification_ref } = user
    const { address, tx_hash: txHash, output_index: outputIndex, lovelace, policy_id: policyId, datum } = zk_verification_ref
    
    const { spend, spendAddress: walletAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName)
    console.log('Janus wallet Address:', walletAddress);

    const assetUnit = `${policyId}${tokenName}`;
    console.log("AssetUnit", assetUnit)
    const utxoRef: UTxO = {
        address,
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

    const utxos = (await lucid.utxosAt(walletAddress))
    console.log('Wallet UTXOs:', utxos);
    const reqLovelace = BigInt(amount)
    const outputs: TxOutput[] = [{ address: receiveAddress, assets: {...assets, lovelace: reqLovelace }}] 
    const { inputs } = coinSelection(utxos, outputs, walletAddress)
    console.log("Coin Selection Inputs:", inputs)
    const tx = await buildUncheckedTx(lucid, [utxoRef], inputs, walletAddress, spend, reqLovelace, validTo, receiveAddress, zkInput, policyId, tokenName, network, { localUPLCEval: true })
    return tx.to_cbor_hex()
}

export async function generateRedeemer(username: string, pwd: string, txCbor: string): Promise<string> {
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
    return buildZKProofRedeemer(txCbor, zkInput)
}

export async function spendWalletFunds(username: string, redeemer: string, txCbor: string) {
    const tokenName = fromText(username)
    const userId = buildUserId(username)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const lucid = await getLucid;
    const txId = await spendTx(lucid, redeemer, txCbor);

    return txId;
};


