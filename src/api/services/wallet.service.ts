import { Assets, CertificateValidator, CML, Data, fromText, Network, Script, TxOutput, UTxO, validatorToRewardAddress } from '@lucid-evolution/lucid';
import { createUser, getUserById } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput, buildSpendTx, buildZKProofRedeemer, buildAllSpendRedeemers, mintAssetsTx, fromMintUtxoRefAssetsToAssets, getMinAda, registerAndDelegateTx, delegateTx, delegateDrepTx, DRepresentative, buildDrep, withdrawTx } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';
import { coinSelection } from '../../utils/coin-selection.js';
import { getSignerKeyHex } from './circuit.service.js';
import { AccountDatum, MintRedeemer } from '../../utils/contract-types.js';
import { getCircuit } from '../../repositories/circuit.repository.js';
import { randomUUID } from 'crypto';

const validators = readValidators();

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
    const { spend, spendAddress } = generateSpendScript(validators.spend.script, network, policy_id, asset_name, tokenName, hash, addrNonce)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const utxoRef = await mintAssetsTx(lucid, datum, mintRedeemer, tokenName, walletAddress, mint_script as Script, policy_id, spendAddress, validTo, '', { localUPLCEval: true })
    const user = {
        token_name: tokenName,
        pwd_hash: hash,
        spend_address: spendAddress,
        policy_id: policy_id,
        nonce: addrNonce,
        spend_script: spend,
        mint_utxo_ref: utxoRef
    }
    await createUser(user)
    return user
}

export async function buildSpend(userId: string, amount: number, receiveAddress: string, network: Network, assets: Assets): Promise<{tx: string}> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }
    const { token_name: tokenName, mint_utxo_ref, spend_script, spend_address: spendAddress, policy_id: policyId, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, assets: userAssets , datum } = mint_utxo_ref
    console.log('Janus wallet Address:', spendAddress);

    const userUtxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: fromMintUtxoRefAssetsToAssets(userAssets),
        datum
    }
    const circuitUtxoRef: UTxO = {
        address: circuit.mint_address,
        txHash: circuit.mint_utxo_ref.tx_hash,
        outputIndex: circuit.mint_utxo_ref.output_index,
        assets: fromMintUtxoRefAssetsToAssets(circuit.mint_utxo_ref.assets),
        datum: circuit.mint_utxo_ref.datum
    }
    const zkInput: ZkInput = {
        userId: tokenName,
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

    const validTo = Date.now() + (1 * 60 * 60 * 1000) // 1 hour
    const tx = await buildSpendTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, spendAddress, spend_script as Script, reqLovelace, validTo, receiveAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}

export async function generateRedeemer(userId: string, pwd: string, txCbor: string): Promise<string[]> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const zkInput: ZkInput = {
        userId: user.token_name,
        hash: user.pwd_hash,
        pwd
        // pwd: "12345"
    }
    const redeemer = await buildZKProofRedeemer(txCbor, zkInput, 0, 0, 0)

    // find how many spend redeemers are in the tx
    const tx = CML.Transaction.from_cbor_hex(txCbor)
    const witnessSet = tx.witness_set()

    const redeemers = witnessSet.redeemers()!
    let count = 0
    for (let i = 0; i < redeemers.as_arr_legacy_redeemer()!.len(); i++) {
        const redeemer = redeemers.as_arr_legacy_redeemer()!.get(i)
        if (redeemer.tag() == CML.RedeemerTag.Spend) {
            count++
        }
    }
    console.log("total spend redeemers:", count)
    return buildAllSpendRedeemers(redeemer, count)
}

export async function spendWalletFunds(userId: string, redeemers: string[], txCbor: string) {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const lucid = await getLucid;
    const txId = await spendTx(lucid, redeemers, txCbor);

    return txId;
};

export async function registerAndDelegate(network: Network, userId: string, poolId: string) {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }

    const { token_name: tokenName, spend_script, spend_address: spendAddress, policy_id: policyId, mint_utxo_ref, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, assets: userAssets , datum } = mint_utxo_ref

    const stakeScript = spend_script as CertificateValidator
    const rewardAddress = validatorToRewardAddress(network, stakeScript)

    const userUtxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: fromMintUtxoRefAssetsToAssets(userAssets),
        datum
    }
    const circuitUtxoRef: UTxO = {
        address: circuit.mint_address,
        txHash: circuit.mint_utxo_ref.tx_hash,
        outputIndex: circuit.mint_utxo_ref.output_index,
        assets: fromMintUtxoRefAssetsToAssets(circuit.mint_utxo_ref.assets),
        datum: circuit.mint_utxo_ref.datum
    }

    const zkInput: ZkInput = {
        userId: tokenName,
        hash: user.pwd_hash,
    }

    const lucid = await getLucid;

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 5_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await registerAndDelegateTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, poolId, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}

export async function delegate(network: Network, userId: string, poolId: string) {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }

    const { token_name: tokenName, spend_script, spend_address: spendAddress, policy_id: policyId, mint_utxo_ref, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, assets: userAssets , datum } = mint_utxo_ref

    const stakeScript = spend_script as CertificateValidator
    const rewardAddress = validatorToRewardAddress(network, stakeScript)

    const userUtxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: fromMintUtxoRefAssetsToAssets(userAssets),
        datum
    }
    const circuitUtxoRef: UTxO = {
        address: circuit.mint_address,
        txHash: circuit.mint_utxo_ref.tx_hash,
        outputIndex: circuit.mint_utxo_ref.output_index,
        assets: fromMintUtxoRefAssetsToAssets(circuit.mint_utxo_ref.assets),
        datum: circuit.mint_utxo_ref.datum
    }

    const zkInput: ZkInput = {
        userId: tokenName,
        hash: user.pwd_hash,
    }

    const lucid = await getLucid;

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 3_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await delegateTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, poolId, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}

export async function delegateDrep(network: Network, userId: string, dRepresentative: DRepresentative) {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }

    const { token_name: tokenName, spend_script, spend_address: spendAddress, policy_id: policyId, mint_utxo_ref, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, assets: userAssets , datum } = mint_utxo_ref

    const stakeScript = spend_script as CertificateValidator
    const rewardAddress = validatorToRewardAddress(network, stakeScript)

    const userUtxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: fromMintUtxoRefAssetsToAssets(userAssets),
        datum
    }
    const circuitUtxoRef: UTxO = {
        address: circuit.mint_address,
        txHash: circuit.mint_utxo_ref.tx_hash,
        outputIndex: circuit.mint_utxo_ref.output_index,
        assets: fromMintUtxoRefAssetsToAssets(circuit.mint_utxo_ref.assets),
        datum: circuit.mint_utxo_ref.datum
    }

    const zkInput: ZkInput = {
        userId: tokenName,
        hash: user.pwd_hash,
    }

    const lucid = await getLucid;

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 3_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const drep = buildDrep(dRepresentative)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await delegateDrepTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, drep, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}

export async function withdrawRewards(network: Network, userId: string, amount: number) {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const circuit = await getCircuit()
    if (!circuit) {
        throw new Error('Circuit not found')
    }

    const { token_name: tokenName, spend_script, spend_address: spendAddress, policy_id: policyId, mint_utxo_ref, nonce } = user
    const { tx_hash: txHash, output_index: outputIndex, assets: userAssets , datum } = mint_utxo_ref

    const stakeScript = spend_script as CertificateValidator
    const rewardAddress = validatorToRewardAddress(network, stakeScript)

    const userUtxoRef: UTxO = {
        address: spendAddress,
        txHash,
        outputIndex,
        assets: fromMintUtxoRefAssetsToAssets(userAssets),
        datum
    }
    const circuitUtxoRef: UTxO = {
        address: circuit.mint_address,
        txHash: circuit.mint_utxo_ref.tx_hash,
        outputIndex: circuit.mint_utxo_ref.output_index,
        assets: fromMintUtxoRefAssetsToAssets(circuit.mint_utxo_ref.assets),
        datum: circuit.mint_utxo_ref.datum
    }

    const zkInput: ZkInput = {
        userId: tokenName,
        hash: user.pwd_hash,
    }

    const lucid = await getLucid;

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 3_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await withdrawTx(lucid, amount, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}