import { Assets, CertificateValidator, CML, Data, fromText, Network, Script, TxOutput, UTxO, validatorToRewardAddress } from '@lucid-evolution/lucid';
import { createUser, getUserById, updateUser } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput, buildSpendTx, buildZKProofRedeemer, buildAllSpendRedeemers, buildMintAssetsUnsignedTx, fromMintUtxoRefAssetsToAssets, getMinAda, registerAndDelegateTx, delegateTx, delegateDrepTx, DRepresentative, buildDrep, withdrawTx, buildMintAssetsTx, getTransactionId, getUtxoSignerKeys } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';
import { coinSelection } from '../../utils/coin-selection.js';
import { getSignerKeyHex } from './circuit.service.js';
import { AccountDatum, MintRedeemer } from '../../utils/contract-types.js';
import { getCircuit } from '../../repositories/circuit.repository.js';
import { randomUUID } from 'crypto';
import type { AccountTokenStatus, User } from '../../models/user.js';
import type { AccountBalance } from '../../models/account-balance.js';
import { getLedgerAccountBalance, getStakeInfo } from '../../utils/ledger-api.js';
import type { StakeInfo } from '../../models/ledger/stake-info.js';

const validators = readValidators();
const prvKey = process.env.FAKE_PRV_KEY!
const fakePrvKey = CML.PrivateKey.from_bech32(prvKey)

export async function createAccountTx(username: string, network: Network, hash: string, kdfHash: string, utxos: string[], changeAddress: string, nonce?: string): Promise<{user: User, cborTx: string}> {
    const circuit = await getCircuit();
    if (!circuit) {
        throw new Error('Circuit not found')
    }
    const { mint_script, policy_id, asset_name } = circuit

    const lucid = await getLucid;
    lucid.selectWallet.fromPrivateKey(getSignerKeyHex());
    
    const addrNonce = fromText(nonce || randomUUID())
    const tokenName = fromText(username);
    const _datum: AccountDatum = {
        user_id: tokenName,
        hash: kdfHash, // bcrypt.hash(...)
        nonce: addrNonce
    }
    const datum = Data.to(_datum, AccountDatum);
    console.log('Datum', datum);

    const mintRedeemer: MintRedeemer = "CreateAccount";
    const { spend, spendAddress } = generateSpendScript(validators.spend.script, network, policy_id, asset_name, tokenName, hash, kdfHash, addrNonce)

    const signerKeys = getUtxoSignerKeys(utxos)
    const prvKeys = signerKeys.map(_ => fakePrvKey)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const {utxoRef, cborTx: unsignedTx} = await buildMintAssetsUnsignedTx(utxos, lucid, datum, mintRedeemer, tokenName, changeAddress, mint_script as Script, policy_id, spendAddress, validTo, signerKeys, prvKeys, { localUPLCEval: true })
    const user = {
        token_status: "pending" as AccountTokenStatus,
        token_name: tokenName,
        pwd_hash: hash,
        pwd_kdf_hash: kdfHash,
        spend_address: spendAddress,
        policy_id: policy_id,
        nonce: addrNonce,
        spend_script: spend,
        mint_utxo_ref: utxoRef,
    }
    const newUser = await createUser(user)
    return {user: newUser, cborTx: unsignedTx}
}

export async function mintAccountTx(userId: string, unsignedTx: string, txWitnessSet: string): Promise<string> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }

    const txId = getTransactionId(unsignedTx)
    if (txId !== user.mint_utxo_ref.tx_hash) {
        throw new Error(`Invalid txId: ${txId}, was expecting: ${user.mint_utxo_ref.tx_hash}`)
    }
    
    const tx = buildMintAssetsTx(unsignedTx, txWitnessSet, fakePrvKey)
    const cbor = tx.to_cbor_hex()
    console.log('Final Tx:', cbor)

    const lucid = await getLucid;
    const provider = lucid.config().provider!

    let updatedUser = await updateUser(user.id, { token_status: "submitted" as AccountTokenStatus })
    const txHash = await provider.submitTx(cbor)
    console.log('Tx Id (Submit):', txHash);
    updatedUser = await updateUser(user.id, { token_status: "success" as AccountTokenStatus })
    return txHash
}

export async function getWalletAccount(userId: string): Promise<AccountBalance> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }

    return getLedgerAccountBalance(user.spend_address)
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

    const lucid = await getLucid;

    const utxos = (await lucid.utxosAt(spendAddress))
    // console.log('Wallet UTXOs:', utxos);
    const reqLovelace = BigInt(amount)
    const outputs: TxOutput[] = [{ address: receiveAddress, assets: {...assets, lovelace: reqLovelace }}] 
    const { inputs } = coinSelection(utxos, outputs, spendAddress)
    console.log("Coin Selection Inputs:", inputs)
    console.log("Coin Selection Inputs:", inputs.length)

    const validTo = Date.now() + (1 * 60 * 60 * 1000) // 1 hour
    const tx = await buildSpendTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, spendAddress, spend_script as Script, reqLovelace, validTo, receiveAddress, policyId, tokenName, circuit.asset_name, nonce, network, { localUPLCEval: true })
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
        pwd: fromText(pwd)
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

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters!.coinsPerUtxoByte, spendAddress)!
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

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters!.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 3_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await delegateTx(lucid, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, poolId, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}

export async function getStakingDetails(network: Network, userId: string): Promise<StakeInfo> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }

    const stakeAddress = validatorToRewardAddress(network, user.spend_script as CertificateValidator)
    return getStakeInfo(stakeAddress)
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

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters!.coinsPerUtxoByte, spendAddress)!
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

    const { lovelace } = getMinAda({}, lucid.config().protocolParameters!.coinsPerUtxoByte, spendAddress)!
    console.log("lovelace:", lovelace)

    const utxos = (await lucid.utxosAt(spendAddress))
    const outputs: TxOutput[] = [{ address: spendAddress, assets: { lovelace: lovelace + 3_000_000n }}] // TODO: calc how much fee will be needed for this type of tx
    const { inputs } = coinSelection(utxos, outputs, spendAddress)

    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
    const tx = await withdrawTx(lucid, amount, [circuitUtxoRef, userUtxoRef], inputs, rewardAddress, stakeScript, spendAddress, spendAddress, zkInput, policyId, tokenName, circuit.asset_name, nonce, network, validTo, { localUPLCEval: true })
    return {tx: tx.to_cbor_hex()}
}