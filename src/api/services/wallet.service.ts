import { fromText, Network, UTxO } from '@lucid-evolution/lucid';
import { getUserById } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput, buildUncheckedTx, buildZKProofRedeemer } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';

const validators = readValidators();

function buildUserId(username: string): string {
    const tokenName = fromText(username)
    const userId = BigInt(`0x${tokenName}`).toString(16)
    return userId
}

export async function buildSpendTx(username: string, amount: number, receiveAddress: string, network: Network, assets: any) {
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

    // TODO: use cardano-inputSelection or 
    // lucid evolution you can pass all UTxOs and it'll only take the necessary ones?. It seems we do need to pass minimum inputs to prevent evaluateTx and other logics depending on tx inputs size to fails due to size too big
    const utxos = (await lucid.utxosAt(walletAddress)).reduce((acc: {utxos: UTxO[], amount: number}, utxo) => {
        if (acc.amount < lovelace) {
            acc.utxos.push(utxo)
            acc.amount += Number(utxo.assets["lovelace"])
        }
        return acc
        }, {utxos: [], amount: 0}).utxos;
    console.log('UTXOs:', utxos);
    const tx = await buildUncheckedTx(lucid, [utxoRef], utxos, walletAddress, spend, BigInt(amount), validTo, receiveAddress, zkInput, policyId, tokenName, network, { localUPLCEval: true })
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


