import {
    applyDoubleCborEncoding, applyParamsToScript, Data, MintingPolicy, Network, SpendingValidator, Credential, validatorToAddress, validatorToScriptHash,
    Blockfrost, Lucid, getAddressDetails, UTxO, Assets, CML, TxBuilderConfig, Wallet, utxoToTransactionInput,
    utxoToTransactionOutput, SLOT_CONFIG_NETWORK, LucidEvolution, Script, makeTxSignBuilder,
    TxBuilderError, stringify, isEqualUTxO, selectUTxOs, assetsToValue, sortUTxOs, utxoToCore,
    EvalRedeemer, toCMLRedeemerTag, PROTOCOL_PARAMETERS_DEFAULT, createCostModels, CertificateValidator,
    validatorToRewardAddress, PoolId, TxSignBuilder, PolicyId, Lovelace, CBORHex, RedeemerTag,
    TxOutput,
    DRep,
    coresToUtxos,
    type ProtocolParameters,
    type SlotConfig,
    type OutRef,
} from "@lucid-evolution/lucid";
import * as UPLC from "@lucid-evolution/uplc";
import blueprint from "../../plutus.json" assert { type: 'json' };
import { AccountDatum, Address, Certificate, Challenge, ChallengeOutput, Credential as ContractCredential, Datum, DelegateRepresentative, Input, Mint, MintRedeemer, Output, OutputReference, Proof, PublishRedeemer, Redeemer, ReferenceInputs, Signals, Spend, StakeCredential, Value, WithdrawRedeemer } from "./contract-types";
import { pipe, Record, Array as _Array, BigInt as _BigInt, Option } from "effect";
import { generate, circuitHashWithCircom } from "../zkproof";
import { getCollaterls, signCollateral } from "../api/services/collateral.service";
import { coinSelection } from "./coin-selection";
import { getSignerKey } from "../api/services/circuit.service";
import { MintUtxoRef, MintUtxoRefAssets } from "../models/mint-utxo-ref";
import { numberToHex, toCostModels } from "./converter";

export type Validators = {
    spend: SpendingValidator;
    mint: MintingPolicy;
    publish: CertificateValidator
};

export type AppliedValidators = {
    mint: MintingPolicy;
    spend: SpendingValidator;
    policyId: string;
    spendAddress: string;
};

export type DRepresentative = {
    type: "Key" | "Script" | "AlwaysAbstain" | "AlwaysNoConfidence",
    hash?: string
}

export async function buildMintAssetsUnsignedTx(
    txUtxos: string[] | UTxO[],
    lucid: LucidEvolution,
    datum: string,
    mintRedeemer: MintRedeemer,
    tokenName: string,
    walletAddress: string,
    mint: Script,
    policyId: string,
    mintAddress: string,
    validTo: number,
    signerKeys: string[],
    privateKeys: CML.PrivateKey[],
    options?: CompleteOptions
): Promise<{ utxoRef: MintUtxoRef, cborTx: string }> {

    // const { mint, policyId, mintAddress } = generateMintPolicy(network, validators.mint.script, owner, version, nonce);
    console.log('PolicyId:', policyId);
    console.log("Mint Address:", mintAddress)
    console.log('Mint Script:', mint);

    const assetName = `${policyId}${tokenName}`;
    const assets = { [assetName]: 1n }

    const lucidConfig = lucid.config()
    const { lovelace } = getMinAda(assets, lucidConfig.protocolParameters!.coinsPerUtxoByte, mintAddress, datum)!
    console.log("lovelace:", lovelace)

    const outputs: TxOutput[] = [{ address: walletAddress, assets: { lovelace: lovelace + 1_000_000n } }]

    const utxos = txUtxos.every(utxo => typeof utxo === 'object') ? txUtxos : coresToUtxos(txUtxos.map(utxo => CML.TransactionUnspentOutput.from_cbor_hex(utxo)))
    const { inputs } = coinSelection(utxos, outputs, walletAddress)
    const redeemer = Data.to(mintRedeemer, MintRedeemer);
    console.log('Redeemer:', redeemer);

    const config = await makeMintAssetsTxBuilderConfig(lucid, inputs, redeemer, mint, mintAddress, assets, datum, lovelace, validTo, signerKeys)
    const collaterals = await getCollaterls(config);

    // Set collateral input if there are script executions
    setCollateral(config, collaterals.inputs, collaterals.address);

    // get a new txRedeemerBuilder based on updated redeemer with the challenge for evaluation
    let txRedeemerBuilder = config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(walletAddress));
    let uplcEval: ScriptEvaluation[] = [];
    if (options?.localUPLCEval !== false) {
        const txUtxos = [
            ...config.collectedInputs,
            ...config.readInputs,
        ]
        const slotConfig = SLOT_CONFIG_NETWORK[config.lucidConfig.network]
        uplcEval = evalTransaction(txUtxos, txRedeemerBuilder.draft_tx(), config.lucidConfig.protocolParameters, slotConfig);
    } else {
        uplcEval = await evalTransactionProvider(config, txRedeemerBuilder.draft_tx());
    }

    // update txBuilder exUnits and 
    // adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    const tx = config.txBuilder
        .build(
            CML.ChangeSelectionAlgo.Default,
            CML.Address.from_bech32(walletAddress),
        )
        .build_unchecked();

    console.log('How many signers?', privateKeys.length)
    const unsignedTx = await buildFinalTx(tx, [redeemer], lucidConfig.costModels!, privateKeys)

    const cbor = unsignedTx.to_cbor_hex()
    console.log('cbor', cbor);
    const txId = getTransactionId(unsignedTx)
    console.log('Tx Id:', txId);
    return {
        utxoRef: { tx_hash: txId, output_index: 0, assets: fromAssetsToMintUtxoRefAssets({ ...assets, lovelace }), datum },
        cborTx: cbor
    }
}

export function getTransactionId(tx: CML.Transaction | string): string {
    if (typeof tx === "string") {
        tx = CML.Transaction.from_cbor_hex(tx)
    }
    return CML.hash_transaction(tx.body()).to_hex()
}

export function getUtxoSignerKeys(utxos: string[] | UTxO[]): string[] {
    const signers = utxos.reduce((acc, utxo) => {
        const hash = getUtxoAddressPaymentHash(utxo)
        if (hash && !acc[hash]) {
            acc[hash] = true
        }
        return acc
    }, {} as Record<string, boolean>)

    return Object.keys(signers)
}

function getUtxoAddressPaymentHash(utxo: string | UTxO): string | undefined {
    if (typeof utxo === 'string') {
        const credential = CML.TransactionUnspentOutput.from_cbor_hex(utxo).output().address().payment_cred()
        if (credential) {
            return credential.kind() == CML.CredentialKind.PubKey ? credential.as_pub_key()!.to_hex() : credential.as_script()!.to_hex()
        }
        return 
    }

    const credential = getAddressDetails(utxo.address).paymentCredential
    if (credential) {
        return credential.hash
    }
}

export function buildMintAssetsTx(cborTx: string, keyWitnessSet: string, fakePrvKey: CML.PrivateKey): CML.Transaction {
    const tx = CML.Transaction.from_cbor_hex(cborTx)
    const body = tx.body()
    const witnessSet = tx.witness_set()
    const fakeHash = fakePrvKey.to_public().hash().to_hex()
    const {keys: vKeyWitnesses, map} = buildKeyWitnessesMap(witnessSet.vkeywitnesses(), fakeHash)

    // add collateral signature
    const collateralWitness = signCollateral(body)
    const collateralPubKeyHash = collateralWitness.vkey().hash().to_hex()
    if (!map[collateralPubKeyHash]) {
        vKeyWitnesses.add(collateralWitness)
    }
    
    // add key witness signatures
    const txWitnessSet = CML.TransactionWitnessSet.from_cbor_hex(keyWitnessSet)
    const vkeywitnesses = txWitnessSet.vkeywitnesses()
    if (vkeywitnesses) {
        for (let i = 0; i < vkeywitnesses.len(); i++){
            const witness = vkeywitnesses.get(i)
            const hash = witness.vkey().hash().to_hex()
            if (fakeHash != hash && !map[witness.vkey().hash().to_hex()]) {
                vKeyWitnesses.add(witness)
            }
        }
    }

    witnessSet.set_vkeywitnesses(vKeyWitnesses)

    return CML.Transaction.new(
        body,
        witnessSet,
        true,
        tx.auxiliary_data(),
    );
}

function buildKeyWitnessesMap(vKeyWitnesses: CML.VkeywitnessList | undefined, fakeHash: string): {keys: CML.VkeywitnessList, map: Record<string, boolean>} {
    const keys = CML.VkeywitnessList.new()
    const map: Record<string, boolean> = {}
    if (vKeyWitnesses) {
        for (let i = 0; i < vKeyWitnesses.len(); i++){
            const witness = vKeyWitnesses.get(i)
            const hash = witness.vkey().hash().to_hex()
            if (hash !== fakeHash && !map[hash]) {
                map[hash] = true
                keys.add(witness)
            }
        }
    }
    return {keys, map}
}

export async function buildSpendTx(
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    spendAddress: string,
    spend: Script,
    lovelace: bigint,
    validTo: number,
    receiptAddress: string,
    // zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    circuitTokenName: string,
    nonce: string,
    network: Network,
    options?: CompleteOptions) {

    // use eval redeemer and reference datum to pass all onchain checks
    const { userId, pwdHash, pwdKdfHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC, 0, 0, 0);

    const [circuitRefInput, userRefInput] = referenceInputs

    // const evalReferenceInputs = referenceInputs.map(input => {
    //     return {
    //         ...input,
    //         datum: evalReferenceDatum
    //     }
    // });
    const evalReferenceInputs = [circuitRefInput, {
        ...userRefInput,
        assets: { ...userRefInput.assets, [`${policyId}${userId}`]: userRefInput.assets[`${policyId}${tokenName}`] },
        datum: Data.to({ user_id: userId, hash: pwdKdfHash, nonce }, AccountDatum)
    }]

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, circuitTokenName, userId, pwdHash, pwdKdfHash, nonce, true);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script))
        .hash()
        .to_hex());
    const scriptIncrements: ScriptIncrements[] = [];

    const evalInputs = inputs.map((input, i) => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // can't use real address when evaluating tx with external provider since it'll use real address instead or eval
                outputIndex: i,
                // txHash: input.txHash, // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                // txHash: "29e0b0742664ea8f8aacd4696323146c5e4685b92d98a2982fdf561e71918262", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                // outputIndex: 2,
                address: evalSpendAddress
            }
        }
        return input;
    });

    const params: SpendTxParams = {
        lucid,
        referenceInputs,
        inputs,
        redeemers: [""],
        scripts: [spend],
        lovelace,
        spendAddress,
        validTo,
        walletAddress: spendAddress,
        evalWalletAddress: evalSpendAddress,
        // zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: buildAllSpendRedeemers(evalSpendRedeemer, evalInputs.length),
        evalScripts: [evalSpendScript],
        scriptIncrements,
        options,
    };

    return _buildUncheckedTx(params, evalInputs, evalReferenceInputs,
        (params) => {
            const { lucid, referenceInputs, inputs, redeemers, scripts, lovelace, validTo, evalRedeemers, evalScripts } = params as SpendTxParams;
            const spendRedeemers = evalRedeemers || redeemers;
            const [spendScript] = evalScripts || scripts;

            return makeSpendTxBuilderConfig(lucid, referenceInputs, inputs, spendRedeemers, spendScript, receiptAddress, lovelace, validTo);
        })
}

export async function spendTx(
    lucid: LucidEvolution,
    redeemers: string[],
    txCbor: string) {

    const config = lucid.config()
    const provider = config.provider!
    const _tx = CML.Transaction.from_cbor_hex(txCbor);
    const tx = await buildFinalTx(_tx, redeemers, config.costModels!)


    const cbor = tx.to_cbor_hex()
    console.log('cbor', cbor);
    // const txId = CML.hash_transaction(tx.body()).to_hex();
    // console.log('Tx Id:', txId);


    const txId = await provider.submitTx(cbor)
    console.log('Tx Id (Submit):', txId);


    // const success = await lucid.awaitTx(txHash);
    // console.log('Success?', success);
    return txId;
}

export async function registerAndDelegateTx(
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    rewardAddress: string,
    script: Script,
    spendAddress: string,
    poolId: PoolId,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    circuitTokenName: string,
    nonce: string,
    network: Network,
    validTo: number,
    options?: CompleteOptions) {

    // use eval redeemer and reference datum to pass all onchain checks
    const { userId, pwdHash, pwdKdfHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC, 0, 0, 0);

    const [circuitRefInput, userRefInput] = referenceInputs
    const evalReferenceInputs = [circuitRefInput, {
        ...userRefInput,
        assets: { ...userRefInput.assets, [`${policyId}${userId}`]: userRefInput.assets[`${policyId}${tokenName}`] },
        datum: Data.to({ user_id: userId, hash: pwdKdfHash, nonce }, AccountDatum)
    }]

    const publish: PublishRedeemer = "RegisterAndDelegate";
    const publishRedeemer = Data.to(publish, PublishRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, circuitTokenName, userId, pwdHash, pwdKdfHash, nonce, true);
    const evalRewardAddress = validatorToRewardAddress(network, evalSpendScript);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());

    const evalInputs = inputs.map((input, i) => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // can't use real address when evaluating tx with external provider since it'll use real address instead or eval
                outputIndex: i,
                address: evalSpendAddress
            }
        }
        return input;
    });

    const params: StakeAndDelegateTxParams = {
        lucid,
        referenceInputs,
        inputs,
        redeemers: [publishRedeemer, ""],
        scripts: [script, script],
        spendAddress,
        rewardAddress,
        poolId,
        validTo,
        walletAddress,
        evalWalletAddress: evalSpendAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [publishRedeemer, ...buildAllSpendRedeemers(evalSpendRedeemer, evalInputs.length)],
        evalScripts: [evalSpendScript, evalSpendScript],
        options,
        // TODO: once using the new SC check if this is still necessary
        // scriptIncrements: [{ tag: CML.RedeemerTag.Spend, increment: 0.003, scriptHash: evalSpendRedeemer }]
    };

    return _buildUncheckedTx(params, evalInputs, evalReferenceInputs, (params) => {
        const { lucid, referenceInputs, inputs, redeemers, poolId, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as StakeAndDelegateTxParams;
        const [rRedeemer, ...sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeRegisterAndDelegateStakeTxBuilderConfig(lucid, referenceInputs, inputs, rRedeemer, sRedeemer, poolId, stakeScript, spendScript, rAddress, validTo)
    })
}

export async function delegateTx(
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    rewardAddress: string,
    script: Script,
    spendAddress: string,
    poolId: PoolId,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    circuitTokenName: string,
    nonce: string,
    network: Network,
    validTo: number,
    options?: CompleteOptions) {

    // use eval redeemer and reference datum to pass all onchain checks
    const { userId, pwdHash, pwdKdfHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC, 0, 0, 0);

    const [circuitRefInput, userRefInput] = referenceInputs
    const evalReferenceInputs = [circuitRefInput, {
        ...userRefInput,
        assets: { ...userRefInput.assets, [`${policyId}${userId}`]: userRefInput.assets[`${policyId}${tokenName}`] },
        datum: Data.to({ user_id: userId, hash: pwdKdfHash, nonce }, AccountDatum)
    }]

    const publish: PublishRedeemer = "Delegate";
    const publishRedeemer = Data.to(publish, PublishRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, circuitTokenName, userId, pwdHash, pwdKdfHash, nonce, true);
    const evalRewardAddress = validatorToRewardAddress(network, evalSpendScript);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());

    const evalInputs = inputs.map((input, i) => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // can't use real address when evaluating tx with external provider since it'll use real address instead or eval
                outputIndex: i,
                address: evalSpendAddress
            }
        }
        return input;
    });

    const params: StakeAndDelegateTxParams = {
        lucid,
        referenceInputs,
        inputs,
        redeemers: [publishRedeemer, ""],
        scripts: [script, script],
        spendAddress,
        rewardAddress,
        poolId,
        validTo,
        walletAddress,
        evalWalletAddress: evalSpendAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [publishRedeemer, ...buildAllSpendRedeemers(evalSpendRedeemer, evalInputs.length)],
        evalScripts: [evalSpendScript, evalSpendScript],
        options,
    };

    return _buildUncheckedTx(params, evalInputs, evalReferenceInputs, (params) => {
        const { lucid, referenceInputs, inputs, redeemers, poolId, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as StakeAndDelegateTxParams;
        const [rRedeemer, ...sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeDelegateStakeTxBuilderConfig(lucid, referenceInputs, inputs, rRedeemer, sRedeemer, poolId, stakeScript, spendScript, rAddress, validTo)
    })
}

export async function delegateDrepTx(
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    rewardAddress: string,
    script: Script,
    spendAddress: string,
    dRep: DRep,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    circuitTokenName: string,
    nonce: string,
    network: Network,
    validTo: number,
    options?: CompleteOptions) {

    // use eval redeemer and reference datum to pass all onchain checks
    const { userId, pwdHash, pwdKdfHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC, 0, 0, 0);

    const [circuitRefInput, userRefInput] = referenceInputs
    const evalReferenceInputs = [circuitRefInput, {
        ...userRefInput,
        assets: { ...userRefInput.assets, [`${policyId}${userId}`]: userRefInput.assets[`${policyId}${tokenName}`] },
        datum: Data.to({ user_id: userId, hash: pwdKdfHash, nonce }, AccountDatum)
    }]

    const publish: PublishRedeemer = "DelegateDRep";
    const publishRedeemer = Data.to(publish, PublishRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, circuitTokenName, userId, pwdHash, pwdKdfHash, nonce, true);
    const evalRewardAddress = validatorToRewardAddress(network, evalSpendScript);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());

    const evalInputs = inputs.map((input, i) => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // can't use real address when evaluating tx with external provider since it'll use real address instead or eval
                outputIndex: i,
                address: evalSpendAddress
            }
        }
        return input;
    });

    const params: DelegateDRepTxParams = {
        lucid,
        referenceInputs,
        inputs,
        redeemers: [publishRedeemer, ""],
        scripts: [script, script],
        spendAddress,
        rewardAddress,
        drep: dRep,
        validTo,
        walletAddress,
        evalWalletAddress: evalSpendAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [publishRedeemer, ...buildAllSpendRedeemers(evalSpendRedeemer, evalInputs.length)],
        evalScripts: [evalSpendScript, evalSpendScript],
        options,
    };

    return _buildUncheckedTx(params, evalInputs, evalReferenceInputs, (params) => {
        const { lucid, referenceInputs, inputs, redeemers, drep, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as DelegateDRepTxParams;
        const [rRedeemer, ...sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeDelegateDrepTxBuilderConfig(lucid, referenceInputs, inputs, rRedeemer, sRedeemer, drep, stakeScript, spendScript, rAddress, validTo)
    })
}

export async function withdrawTx(
    lucid: LucidEvolution,
    amount: number,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    rewardAddress: string,
    script: Script,
    spendAddress: string,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    circuitTokenName: string,
    nonce: string,
    network: Network,
    validTo: number,
    options?: CompleteOptions) {

    // use eval redeemer and reference datum to pass all onchain checks
    const { userId, pwdHash, pwdKdfHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC, 0, 0, 0);

    const [circuitRefInput, userRefInput] = referenceInputs
    const evalReferenceInputs = [circuitRefInput, {
        ...userRefInput,
        assets: { ...userRefInput.assets, [`${policyId}${userId}`]: userRefInput.assets[`${policyId}${tokenName}`] },
        datum: Data.to({ user_id: userId, hash: pwdKdfHash, nonce }, AccountDatum)
    }]

    const withdraw: WithdrawRedeemer = "Withdraw";
    const withdrawRedeemer = Data.to(withdraw, WithdrawRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, circuitTokenName, userId, pwdHash, pwdKdfHash, nonce, true);
    const evalRewardAddress = validatorToRewardAddress(network, evalSpendScript);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());

    const evalInputs = inputs.map((input, i) => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // can't use real address when evaluating tx with external provider since it'll use real address instead or eval
                outputIndex: i,
                address: evalSpendAddress
            }
        }
        return input;
    });

    const params: WithdrawRewardsTxParams = {
        lucid,
        amount,
        referenceInputs,
        inputs,
        redeemers: [withdrawRedeemer, ""],
        scripts: [script, script],
        spendAddress,
        rewardAddress,
        validTo,
        walletAddress,
        evalWalletAddress: evalSpendAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [withdrawRedeemer, ...buildAllSpendRedeemers(evalSpendRedeemer, evalInputs.length)],
        evalScripts: [evalSpendScript, evalSpendScript],
        options,
        // TODO: once using the new SC check if this is still necessary
        scriptIncrements: [{ tag: CML.RedeemerTag.Reward, increment: 0.013, scriptHash: withdrawRedeemer }]
    };

    return _buildUncheckedTx(params, evalInputs, evalReferenceInputs, (params) => {
        const { lucid, amount, referenceInputs, inputs, redeemers, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as WithdrawRewardsTxParams;
        const [rRedeemer, ...sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeWithdrawTxBuilderConfig(lucid, referenceInputs, inputs, rRedeemer, sRedeemer, stakeScript, spendScript, rAddress, BigInt(amount), validTo)
    })
}

async function _buildUncheckedTx(
    params: TxBuilderParams,
    evalInputs: UTxO[],
    evalReferenceInputs: UTxO[],
    makeTxBuilderConfig: (params: TxBuilderParams) => Promise<TxBuilderConfig>,
): Promise<CML.Transaction> {
    const { walletAddress, options, evalWalletAddress, evalRedeemers, evalScripts, scriptIncrements } = params;

    // get evaluation tx
    let config = await makeTxBuilderConfig({
        ...params,
        referenceInputs: evalReferenceInputs,
        inputs: evalInputs,
        evalRedeemers: evalRedeemers,
        evalScripts: evalScripts
    });
    const collaterals = await getCollaterls(config);

    // Set collateral input if there are script executions
    setCollateral(config, collaterals.inputs, collaterals.address);

    // get a new txRedeemerBuilder based on updated redeemer with the challenge for evaluation
    let txRedeemerBuilder = config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(evalWalletAddress));
    const increments = getEvalIncrements(scriptIncrements, txRedeemerBuilder.draft_tx().witness_set().redeemers()!);
    let uplcEval: ScriptEvaluation[] = [];
    if (options?.localUPLCEval !== false) {
        const txUtxos = [
            ...config.collectedInputs,
            ...config.readInputs,
        ]
        const slotConfig = SLOT_CONFIG_NETWORK[config.lucidConfig.network]
        uplcEval = evalTransaction(txUtxos, txRedeemerBuilder.draft_tx(), config.lucidConfig.protocolParameters!, slotConfig, increments);
        console.log('Evaluation:', uplcEval.map(ev => ev.exUnits.to_json()))
    } else {
        uplcEval = await evalTransactionProvider(config, txRedeemerBuilder.draft_tx(), evalInputs, increments);
        // uplcEval[0].ex_units.mem = 8455482;
        // uplcEval[0].ex_units.steps = 5283365186;
    }

    // update txBuilder exUnits and 
    // adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // get final tx (original inputs but still fake redeemer). We do this to have all inputs and outputs and 
    // then calculate challenge
    config = await makeTxBuilderConfig({ ...params, evalRedeemers: evalRedeemers, evalScripts: undefined });

    // Set collateral input if there are script executions
    setCollateral(config, collaterals.inputs, collaterals.address);

    // update txBuilder exUnits and 
    // adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    const tx = config.txBuilder
        .build(
            CML.ChangeSelectionAlgo.Default,
            CML.Address.from_bech32(walletAddress),
        )
        .build_unchecked();
    return tx;
}

export function randomNonce(s = 32): string {
    if (s % 2 == 1) {
        throw new Error("Only even sizes are supported");
    }
    const buf = new Uint8Array(s / 2);
    crypto.getRandomValues(buf);
    let nonce = "";
    for (let i = 0; i < buf.length; ++i) {
        nonce += ("0" + buf[i].toString(16)).slice(-2);
    }
    console.log('Nonce:', nonce);
    return nonce;
}

export function readValidators(): Validators {
    const spend = blueprint.validators.find((v) => v.title === "janus.account.spend");
    if (!spend) {
        throw new Error("Spend validator not found");
    }

    const publish = blueprint.validators.find((v) => v.title === "janus.account.publish");
    if (!publish) {
        throw new Error("Publish validator not found");
    }

    const mint = blueprint.validators.find((v) => v.title === "janus.wallet.mint");
    if (!mint) {
        throw new Error("Mint validator not found");
    }


    return {
        spend: {
            type: "PlutusV3",
            script: spend.compiledCode,
        },
        mint: {
            type: "PlutusV3",
            script: mint.compiledCode,
        },
        publish: {
            type: "PlutusV3",
            script: publish.compiledCode,
        },
    };
}

export function readFooValidator() {
    const spendFoo = blueprint.validators.find((v) => v.title === "janus.foo.spend");

    return {
        type: "PlutusV3",
        script: spendFoo!.compiledCode,
    }

}

export function generateMintPolicy(network: Network, mint_script: string, signerKey: string, version: number, nonce: string) {
    const params = Data.to({
        version: BigInt(version),
        owner: signerKey,
        nonce
    }, Mint);
    console.log('Mint params:', params);
    const mintParams = Data.from(params);

    const mint: MintingPolicy = {
        type: "PlutusV3",
        script: applyParamsToScript(applyDoubleCborEncoding(mint_script),
            [
                mintParams
            ],
        )
    };

    const policyId = validatorToScriptHash(mint);
    const stakeCredential: Credential = {
        type: "Script",
        hash: policyId
    };
    const mintAddress = validatorToAddress(network, mint, stakeCredential);

    return {
        mint,
        policyId,
        mintAddress
    };
}

export function generateSpendScript(
    spend_script: string,
    // policy: Policy,
    // credential: Credential,
    network: Network,
    policyId: string,
    circuitAssetName: string,
    assetName: string,
    pwdHash: string,
    pwdKdfHash: string,
    nonce: string,
    forEvaluation = false,
) {
    const params = Data.to({
        policy_id: policyId,
        circuit_asset_name: circuitAssetName,
        asset_name: assetName,
        pwd_hash: pwdHash,
        pwd_kdf_hash: pwdKdfHash,
        nonce,
        for_evaluation: forEvaluation
    }, Spend);

    console.log('Spend params:', params);
    const spendParams = Data.from(params);
    console.log('Spend params:', spendParams.toString());
    console.log('Spend params:', Data.to(spendParams));



    const spend: SpendingValidator = {
        type: "PlutusV3",
        script: applyParamsToScript(applyDoubleCborEncoding(spend_script),
            [
                spendParams
            ],
        )
    };

    const scriptHash = validatorToScriptHash(spend);
    const stakeCredential: Credential = {
        type: "Script",
        hash: scriptHash
    };
    const spendAddress = validatorToAddress(network, spend, stakeCredential);
    console.log('Spend script hash:', scriptHash);
    console.log('Script address (with script stake credential):', spendAddress);


    return {
        spend,
        spendAddress
    };
}

export const r = 52435875175126190479447740508185965837690552500527637822603658699938581184513n

export function getSpendRedeemer(userId: string, pwdHash: string, challenge: string, pA: string, pB: string, pC: string, selfIdx: number, idx: number, jdx: number) {
    const signals: Signals = {
        userId: userId,
        challenge: challenge,
        hash: pwdHash
    }

    const proof: Proof = {
        pA,
        pB,
        pC
    }

    const redeemer: Redeemer = {
        self_idx: BigInt(selfIdx),
        idx: BigInt(idx),
        jdx: BigInt(jdx),
        signals,
        proof
    };

    const spendRedeemer = Data.to(redeemer, Redeemer);
    console.log('Redeemer:', spendRedeemer);

    return spendRedeemer;
}

export function getInput(utxo: UTxO): Input {
    const outputReference: OutputReference = {
        transaction_id: utxo.txHash,
        output_index: BigInt(utxo.outputIndex)
    };

    const address = getChallengeAddress(utxo.address);
    const value = getValue(utxo.assets);
    const datum = getDatum(utxo.datumHash, utxo.datum);
    const referenceScript = utxo.scriptRef?.script || null;
    const output: Output = {
        address: address,
        value: value,
        datum: datum,
        reference_script: referenceScript
    };

    // const input = Data.to({
    //     output_reference: outputReference,
    //     output: output
    // }, Input)
    const input: Input = {
        output_reference: outputReference,
        output: output
    }
    return input;
}

export function serialiseReferenceInputs(utxos: UTxO[]): string {
    const inputs = utxos.map(utxo => getInput(utxo));
    return Data.to(inputs, ReferenceInputs);
}

// TODO: this func is a **direct** copy from Lucid-Evolution, we should create a PR to expose and use it directly
function setRedeemerstoZero(tx: CML.Transaction): CML.Transaction | undefined {
    const redeemers = tx.witness_set().redeemers();
    if (redeemers) {
        const redeemerList = CML.LegacyRedeemerList.new();
        for (let i = 0; i < redeemers.as_arr_legacy_redeemer()!.len(); i++) {
            const redeemer = redeemers.as_arr_legacy_redeemer()!.get(i);
            const dummyRedeemer = CML.LegacyRedeemer.new(
                redeemer.tag(),
                redeemer.index(),
                redeemer.data(),
                CML.ExUnits.new(0n, 0n),
            );
            redeemerList.add(dummyRedeemer);
        }
        const dummyWitnessSet = tx.witness_set();
        dummyWitnessSet.set_redeemers(
            CML.Redeemers.new_arr_legacy_redeemer(redeemerList),
        );

        return CML.Transaction.new(
            tx.body(),
            dummyWitnessSet,
            true,
            tx.auxiliary_data(),
        );
    }
}

// TODO: this func is a **copy** from Lucid-Evolution, we should create a PR to expose and use it directly
async function getWalletInfo(config: TxBuilderConfig): Promise<{ wallet: Wallet, address: string, inputs: UTxO[] }> {
    const wallet = config.lucidConfig.wallet!;
    const address = await wallet?.address();
    const inputs = config.walletInputs.length == 0 ? await wallet.getUtxos() : config.walletInputs;
    return {
        wallet,
        address,
        inputs
    }
}

// TODO: this func is a **copy** from Lucid-Evolution, we should create a PR to expose and use it directly
export type CompleteOptions = {
    coinSelection?: boolean;
    changeAddress?: Address;
    localUPLCEval?: boolean; // replaces nativeUPLC
};

interface ScriptEvaluation {
    tag: CML.RedeemerTag;
    index: bigint;
    exUnits: CML.ExUnits;
}

interface ScriptIncrements {
    tag: CML.RedeemerTag;
    increment: number,
    scriptHash: string
}

// TODO: this func is a **direct** copy from Lucid-Evolution, we should create a PR to expose and use it directly
export function evalTransaction(
    txUtxos: UTxO[],
    tx: CML.Transaction,
    protocolParameters: ProtocolParameters,
    slotConfig: SlotConfig,
    extraIncrements?: Map<CML.RedeemerTag, Map<number, number>>,
): ScriptEvaluation[] {
    const txEvaluation = setRedeemerstoZero(tx)!;
    const ins = txUtxos.map((utxo) => utxoToTransactionInput(utxo));
    const outs = txUtxos.map((utxo) => utxoToTransactionOutput(utxo));
    try {
        const uplcEval = UPLC.eval_phase_two_raw(
            txEvaluation.to_cbor_bytes(),
            ins.map((value) => value.to_cbor_bytes()),
            outs.map((value) => value.to_cbor_bytes()),
            // config.lucidConfig.costModels.to_cbor_bytes(),
            // createCostModels(PROTOCOL_PARAMETERS_DEFAULT.costModels).to_cbor_bytes(),
            createCostModels(toCostModels(protocolParameters.costModels)).to_cbor_bytes(),
            protocolParameters.maxTxExSteps,
            protocolParameters.maxTxExMem,
            BigInt(slotConfig.zeroTime),
            BigInt(slotConfig.zeroSlot),
            slotConfig.slotLength,
        );
        const increments = extraIncrements || new Map<CML.RedeemerTag, Map<number, number>>();
        return uplcEval.map(bytes => {
            const redeemer = CML.LegacyRedeemer.from_cbor_bytes(bytes);
            const tag = redeemer.tag();
            const index = redeemer.index();

            const increment = 1 + getRedeemerIncrement(increments, tag, Number(index));
            console.log("increments eval:", increment, tag, index, Math.ceil(Number(redeemer.ex_units().mem()) * increment), Math.ceil(Number(redeemer.ex_units().steps()) * increment))
            return {
                tag: tag,
                index: index,
                exUnits: CML.ExUnits.new(
                    BigInt(Math.ceil(Number(redeemer.ex_units().mem()) * increment)),
                    BigInt(Math.ceil(Number(redeemer.ex_units().steps()) * increment))
                )
            }
        })
    } catch (error) {
        console.log("Evaluation error:", error);
        throw error
    }
}

async function evalTransactionProvider(
    config: TxBuilderConfig,
    tx: CML.Transaction,
    additionalUtxos?: UTxO[],
    extraIncrements?: Map<CML.RedeemerTag, Map<number, number>>,
): Promise<ScriptEvaluation[]> {
    const txEvaluation = setRedeemerstoZero(tx)!;

    try {
        console.log("Additional providers:", additionalUtxos)
        const uplcEval = await config.lucidConfig.provider.evaluateTx(
            txEvaluation.to_cbor_hex(),
            additionalUtxos,
        );
        const increments = extraIncrements || new Map<CML.RedeemerTag, Map<number, number>>();
        return uplcEval.map(evalRedeemer => {
            // TODO: remove this once the bug is fixed
            // it should accept "certificate"?
            if (evalRedeemer.redeemer_tag as string == "certificate") {
                evalRedeemer.redeemer_tag = "publish";
            }

            // TODO: remove this once the bug is fixed
            // it should accept "whitdrawal"?
            if (evalRedeemer.redeemer_tag as string == "withdrawal") {
                evalRedeemer.redeemer_tag = "withdraw";
            }

            const tag = toCMLRedeemerTag(evalRedeemer.redeemer_tag);
            const index = evalRedeemer.redeemer_index;
            const increment = 1 + getRedeemerIncrement(increments, tag, index);
            return {
                tag: tag,
                index: BigInt(index),
                exUnits: CML.ExUnits.new(
                    BigInt(Math.ceil(evalRedeemer.ex_units.mem * increment)),
                    BigInt(Math.ceil(evalRedeemer.ex_units.steps * increment))
                )
            }
        })
    } catch (error) {
        console.log("Evaluation error:", error);
        throw error
    }
}

function getRedeemerIncrement(increments: Map<CML.RedeemerTag, Map<number, number>>, tag: CML.RedeemerTag, index: number): number {
    const map = increments.get(tag);
    if (!map) {
        return 0;
    }
    return map.get(index) || 0;
}

// TODO: this func is a **direct** copy from Lucid-Evolution, we should create a PR to expose and use it directly
function applyUPLCEval(
    uplcEval: ScriptEvaluation[],
    txBuilder: CML.TransactionBuilder,
    changeAddress: string
) {
    for (const { tag, index, exUnits } of uplcEval) {
        txBuilder.set_exunits(CML.RedeemerWitnessKey.new(tag, index), exUnits);
    }

    txBuilder.add_change_if_needed(CML.Address.from_bech32(changeAddress), true);
}

function getEvalIncrements(scriptIncrements: ScriptIncrements[] | undefined, redeemers: CML.Redeemers): Map<CML.RedeemerTag, Map<number, number>> {
    const map = new Map<CML.RedeemerTag, Map<number, number>>();
    if (scriptIncrements) {
        const redeemerList = redeemers.as_arr_legacy_redeemer()!
        for (let i = 0; i < redeemerList.len(); i++) {
            const redeemer = redeemerList.get(i)
            const hex = redeemer.data().to_cbor_hex()
            const target = scriptIncrements.find(s => s.scriptHash == hex)
            if (target) {
                map.set(redeemer.tag(), new Map([[Number(redeemer.index()), target.increment]]))
            }
        }
    }

    return map;
}

export interface ZKProof {
    userId: string,
    pwdHash: string,
    pA: string,
    pB: string,
    pC: string
}

export interface ZkInput {
    userId: string,
    hash?: string,
    pwd?: string,
}

const validators = readValidators();

// const evalZkProof = {
//     userId: "466f6e74757323303030",
//     pwdHash: BigInt("10343661163184219313272354919635983875711247223011266158462328948931637363678").toString(16),
//     challenge: "26d853c70b2a7979988708b791c674854088712e60c8562d6a4252ab88d74928",
//     pA: "82d5d19cf3e90d5440cd30d1814545ef82f6488ebc8976e16a3b52a9b8c3c70bd117f7c44c1f9bc7408e42c9d7004ab4",
//     pB: "854c38232bf1d07fa7f7df0653eeb3a6adbbfb7baf014eac007d4b2c3c906f2d217a138634b42c20437e7480f8f973c81871b23c1161a3ca93219c5d39a19631759e2afb3ca78c357dbc2183dc381b852c08876a66f415c03bfa7310dc303a54",
//     pC: "90c5e42f844fec0cfb72f574d0074bbdbde23adbbbf67db3e73d04a20a116f9919bab3bf7a0198453fa7d2e8c9379096"
// }

const evalZkProof = {
    userId: "73EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000000", // scalar.field_prime - 1
    pwdHash: "33fc9188a093a8445bdf8ace10a2ff7ecd9c74564b000a887b1ae717987f0807", // circuit credential hash poseidon(5)
    pwdKdfHash: "243262243130246c7937437063726c42786e777977416b5a34494e444f5a766a6f3844386f49504a6274767938614e313467564d6c356a5746726243", // bcrypt.hash(userId, salt)
    // Guarantee overflow logic is executed and final value scalar.field_prime - 1, since number is 2 * scalar.field_prime - 1 
    challenge: "E7DB4EA6533AFA906673B0101343B00AA77B4805FFFCB7FDFFFFFFFE00000001",
    pA: "af46f51c9067ff3f6ae57ba0f76d9de33e979d01c0f91a40fc600f467b8fd0a3804d1968c2836632d728450b5d2614d4",
    pB: "816dc1b644722dcaf92aba79949fb514b19f0289dec36e9d49e9fec755244636e321ac6e6d37cc78381fc37eced6e5d7057e8187d6fd098df9647146154565800cbd3f64a809bb4e565416c967c60ad6e32f83a9def38b0ad5ba826ec45a1e0a",
    pC: "8881425d2cf63d3e019a4eb858b79d536804ce76ee499dc562cf0bac94db104963f7599c96ee98b2f47c58a780c62980"
}
// TODO: use more complexity points in the curve (closer to field upper bound 2^381-1)
// Then run stress-test to determine a empirical maximum eval proof, meaning will returm bigger exUnits.
// Apply a 5-10% to increase the likelihood of having an upper bound exUnit
// const evalZkProof = {
//     userId: "466f6e74757323303030",
//     pwdHash: BigInt("10343661163184219313272354919635983875711247223011266158462328948931637363678").toString(16),
//     challenge: "B2005F8E22E380F580A3E2378F3AE546A95E4BB9B30BCA6A67F22A9607C65461",
//     pA: "af46f51c9067ff3f6ae57ba0f76d9de33e979d01c0f91a40fc600f467b8fd0a3804d1968c2836632d728450b5d2614d4",
//     pB: "816dc1b644722dcaf92aba79949fb514b19f0289dec36e9d49e9fec755244636e321ac6e6d37cc78381fc37eced6e5d7057e8187d6fd098df9647146154565800cbd3f64a809bb4e565416c967c60ad6e32f83a9def38b0ad5ba826ec45a1e0a",
//     pC: "8881425d2cf63d3e019a4eb858b79d536804ce76ee499dc562cf0bac94db104963f7599c96ee98b2f47c58a780c62980"
// }

const evalReferenceDatum = "D8799F582073EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000000582073EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000000D8799F5830B18DB01619508D589BA45CDCC9C9AB4DBDDC33E08BC4DBDDEA565C10DC743FD66510D3F49C6343999CAF540EAA0C4E035F5840845F7A4F6D0FBCAF0648D9C2657F19A33F4E2124C284D68688F209ABF54D5A1D1AFC47DE55C24E662C47F7632A760A8016E8BA01EB4B0D4A2DB67FE5ABED5AE15820A09E035DBE984A1426E440A4F0038276792F87CDB2BC35DC185A618D352D7F54FF5F584093E02B6052719F607DACD3A088274F65596BD0D09920B61AB5DA61BBDC7F5049334CF11213945D57E5AC7D055D042B7E024AA2B2F08F0A91260805272DC510515820C6E47AD4FA403B02B4510B647AE3D1770BAC0326A805BBEFD48056C8C121BDB8FF5F5840A2341A098A95305955386A3E0E4E2879E6206342B9C9A8DA0559190E82F3ED1478158F2CA1EF4DB7DEAB124B7C85B0F403D1A968B4812E6C9C9392D926B86DA5582001E23F6C94CFFCC62B02393D7807A6F381E40CA49A9B4A2B522518F72927CA15FF9F5830AC2FCD68B85B64E6C3BC11A9DADD1B24E7786738475CF2FE0ACDD9B41F773AF18EC12601E368D2E920F299F9E6BED4805830A33061A2549EA773D275539B2E92CAA6F936404635DB1DA3199EC71F06FAF2CBA8EFFEF6860BCB0376259A681EF043C35830A3F6177EA5EF5797249DF745BE266271BD65A6A1C9C9FAE2DF3DD2C7E9E6B5751F288FBA11950455A9A1F9A054BAD8545830A5D227C013957479BE181BF43C394A49E8BF14585FD04A4CA72102E3E5AB41661411EEB15986AD3D3A09EB25BB2B7B12583093A152A9CD7D4B81A08989F67FCB958E96B14EF4D3CEFD26AD992059DF4D252A9F00B5F9F2B5B8A59CF4ECA9D78848935830B8CD6DACEEAA3B53D707AE2B99DC87E0DBBF58A1E310CFF5CD3BEA151D90962372DE834A519A879C05BC470A016202D65830A6B5D4A12FAF84AC46DBA1793716CDB14009AF64D0EDCD5F1C0CA872FA53BC5732DA912222FC3D4FC7EA2FC1B9FBFF41FFFFFF";

type SpendTxParams = {
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    lovelace: bigint,
    validTo: number,
    walletAddress: string,
    evalWalletAddress: string,
    zkInput?: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    evalRedeemers?: string[],
    evalScripts?: Script[],
    scriptIncrements?: ScriptIncrements[],
    options?: CompleteOptions
}

type StakeAndDelegateTxParams = {
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    rewardAddress: string,
    poolId: PoolId,
    validTo: number,
    walletAddress: string,
    evalWalletAddress: string;
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    evalRedeemers?: string[],
    evalScripts?: Script[],
    scriptIncrements?: ScriptIncrements[],
    options?: CompleteOptions
}

type DelegateDRepTxParams = {
    lucid: LucidEvolution,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    rewardAddress: string,
    drep: DRep,
    validTo: number,
    walletAddress: string,
    evalWalletAddress: string;
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    evalRedeemers?: string[],
    evalScripts?: Script[],
    scriptIncrements?: ScriptIncrements[],
    options?: CompleteOptions
}

type WithdrawRewardsTxParams = {
    lucid: LucidEvolution,
    amount: number,
    referenceInputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    rewardAddress: string,
    validTo: number,
    walletAddress: string,
    evalWalletAddress: string;
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    evalRedeemers?: string[],
    evalScripts?: Script[],
    scriptIncrements?: ScriptIncrements[],
    options?: CompleteOptions
}

type TxBuilderParams = SpendTxParams | StakeAndDelegateTxParams | DelegateDRepTxParams | WithdrawRewardsTxParams;

async function buildFinalTx(tx: CML.Transaction, finalRedeemers: string[], costModels: CML.CostModels, extraSigners?: CML.PrivateKey[]): Promise<CML.Transaction> {
    const body = tx.body();
    const witnessSet = tx.witness_set();

    const redeemers = witnessSet.redeemers()!;
    const redeemerList = CML.LegacyRedeemerList.new();
    console.log("Redeemers count:", redeemers.as_arr_legacy_redeemer()!.len())
    console.log('Final Redeemers:', finalRedeemers.length)
    for (let i = 0; i < redeemers.as_arr_legacy_redeemer()!.len(); i++) {
        const redeemer = redeemers.as_arr_legacy_redeemer()!.get(i);
        const tag = redeemer.tag()
        const legacyRedeemer = CML.LegacyRedeemer.new(
            tag,
            redeemer.index(),
            tag == CML.RedeemerTag.Spend ? CML.PlutusData.from_cbor_hex(finalRedeemers[i]) : redeemer.data(),
            redeemer.ex_units(),
        );
        redeemerList.add(legacyRedeemer);
    }
    const usedLanguages = CML.LanguageList.new();
    if (witnessSet.plutus_v1_scripts()) {
        usedLanguages.add(CML.Language.PlutusV1);
    }
    if (witnessSet.plutus_v2_scripts()) {
        usedLanguages.add(CML.Language.PlutusV2);
    }
    if (witnessSet.plutus_v3_scripts()) {
        usedLanguages.add(CML.Language.PlutusV3);
    }

    const newRedeemers = CML.Redeemers.new_arr_legacy_redeemer(redeemerList);
    const plutusDatums = witnessSet.plutus_datums() || CML.PlutusDataList.new();
    const scriptDataHash = CML.calc_script_data_hash(newRedeemers, plutusDatums, costModels, usedLanguages)!;
    console.log('New script_data_hash:', scriptDataHash.to_hex());

    witnessSet.set_redeemers(newRedeemers);

    // console.log('Eval witnessSet', tx.witness_set().to_cbor_hex());
    // console.log('Eval script_data_hash', tx.body().script_data_hash()!.to_hex());

    // console.log('New witnessSet', witnessSet.to_cbor_hex());
    // console.log('New Redeemers:', newRedeemers.to_cbor_hex());

    body.set_script_data_hash(scriptDataHash);

    const txBodyHash = CML.hash_transaction(body)
    const vKeyWitnesses = witnessSet.vkeywitnesses() || CML.VkeywitnessList.new()

    // add collateral signature
    const collateralWitness = signCollateral(body)
    vKeyWitnesses.add(collateralWitness)
    const collateralPubKeyHash = collateralWitness.vkey().hash().to_hex()

    // add extra signers
    if (extraSigners) {
        for (let privateKey of extraSigners) {
            const pubKeyHash = privateKey.to_public().hash().to_hex()
            if (collateralPubKeyHash != pubKeyHash) {
                vKeyWitnesses.add(CML.make_vkey_witness(txBodyHash, privateKey))
            }
        }
    }

    witnessSet.set_vkeywitnesses(vKeyWitnesses)

    return CML.Transaction.new(
        body,
        witnessSet,
        true,
        tx.auxiliary_data(),
    );
    // const w = await config.lucidConfig.wallet?.signTx(_tx);
    // witnessSet.set_vkeywitnesses(w?.vkeywitnesses()!);

    // return CML.Transaction.new(
    //     body,
    //     witnessSet,
    //     true,
    //     tx.auxiliary_data(),
    // );
}

export function fromAssetsToMintUtxoRefAssets(assets: Assets): MintUtxoRefAssets {
    return Object.entries(assets).reduce((map, [key, value]) => ({ ...map, [key]: Number(value) }), {} as MintUtxoRefAssets)
}

export function fromMintUtxoRefAssetsToAssets(assets: MintUtxoRefAssets): Assets {
    return Object.entries(assets).reduce((map, [key, value]) => ({ ...map, [key]: BigInt(value) }), {} as Assets)
}

export function buildZKProofRedeemer(txCbor: string, zkInput: ZkInput, self_idx: number, idx: number, jdx: number): Promise<string> {
    const txBody = CML.Transaction.from_cbor_hex(txCbor).body()
    return buildRedeemer(txBody, zkInput, self_idx, idx, jdx)
}

export function buildAllSpendRedeemers(redeemer: string, size: number): string[] {
    return [redeemer, ...Array.from({ length: size - 1 }, (_, i) => buildDummySpendReedemer(i + 1, 0))]
}

export function buildDummySpendReedemer(self_idx: number, idx: number): string {
    const emptyRedeemer: Redeemer = {
        self_idx: BigInt(self_idx),
        idx: BigInt(idx),
        jdx: -1n,
        signals: null,
        proof: null
    };
    return Data.to(emptyRedeemer, Redeemer)
}

export function getMinAda(assets: Assets, coinsPerUtxoByte: bigint, changeAddress?: string, datum?: string) {
    return pipe(
        calculateExtraLovelace(assets, coinsPerUtxoByte, changeAddress, datum),
        Option.getOrUndefined,
    )
}

function makeSpendTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], spendRedeemers: string[], spend: Script, walletAddress: string, lovelace: bigint, validTo: number) {
    let txBuilder = lucid
        .newTx()
        .readFrom(reference_inputs)

    for (let i = 0; i < inputs.length; i++) {
        txBuilder = txBuilder.collectFrom([inputs[i]], spendRedeemers[i])
    }

    return txBuilder
        // consume script
        .attach.SpendingValidator(spend)
        .pay.ToAddress(
            walletAddress,
            {
                lovelace: BigInt(lovelace),
            }
        )
        .validTo(validTo)
        .config();
}

function makeMintAssetsTxBuilderConfig(lucid: LucidEvolution, inputs: UTxO[], mintRedeemer: string, mint: Script, mintAddress: string, assets: Assets, datum: string, lovelace: bigint, validTo: number, signerKey?: string[]) {
    let builder = lucid
        .newTx()
        .collectFrom(inputs)
        // use the mint validator
        .attach.MintingPolicy(mint)
        // mint the asset
        .mintAssets(
            assets,
            // this redeemer is the first argument
            mintRedeemer
        )
        .pay.ToContract(
            mintAddress,
            {
                kind: "inline",
                value: datum,
            },
            {
                lovelace,
                ...assets
            }
        )
        .validTo(validTo)
    if (signerKey) {
        for (let key of signerKey) {
            builder = builder.addSignerKey(key)
        }
    }
    return builder.config()
}

function makeRegisterAndDelegateStakeTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], registerRedeemer: string, spendRedeemers: string[], poolId: PoolId, stake: Script, spend: Script, rewardAddress: string, validTo: number) {
    let txBuilder = lucid
        .newTx()
        .readFrom(reference_inputs);

    for (let i = 0; i < inputs.length; i++) {
        txBuilder = txBuilder.collectFrom([inputs[i]], spendRedeemers[i])
    }

    return txBuilder
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .registerAndDelegate.ToPool(rewardAddress, poolId, registerRedeemer)
        .validTo(validTo)
        .config();
}

function makeDelegateStakeTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], stakeRedeemer: string, spendRedeemers: string[], poolId: PoolId, stake: Script, spend: Script, rewardAddress: string, validTo: number) {
    let txBuilder = lucid
        .newTx()
        .readFrom(reference_inputs);

    for (let i = 0; i < inputs.length; i++) {
        txBuilder = txBuilder.collectFrom([inputs[i]], spendRedeemers[i])
    }

    return txBuilder
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .delegate.ToPool(rewardAddress, poolId, stakeRedeemer)
        .validTo(validTo)
        .config();
}

function makeDelegateDrepTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], drepRedeemer: string, spendRedeemers: string[], drep: DRep, stake: Script, spend: Script, rewardAddress: string, validTo: number) {
    let txBuilder = lucid
        .newTx()
        .readFrom(reference_inputs)

    for (let i = 0; i < inputs.length; i++) {
        txBuilder = txBuilder.collectFrom([inputs[i]], spendRedeemers[i])
    }

    return txBuilder
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .delegate.VoteToDRep(rewardAddress, drep, drepRedeemer)
        .validTo(validTo)
        .config()
}

function makeWithdrawTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], withdrawRedeemer: string, spendRedeemers: string[], stake: Script, spend: Script, rewardAddress: string, amount: Lovelace, validTo: number) {
    let txBuilder = lucid
        .newTx()
        .readFrom(reference_inputs)

    for (let i = 0; i < inputs.length; i++) {
        txBuilder = txBuilder.collectFrom([inputs[i]], spendRedeemers[i])
    }

    return txBuilder
        .withdraw(rewardAddress, amount, withdrawRedeemer)
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .validTo(validTo)
        .config()
}

function addCertificate(
    stakeCredential: Credential,
    config: TxBuilderConfig,
    buildCert: (credential: CML.Credential) => CML.SingleCertificateBuilder,
    redeemer?: string,
) {
    const credential = CML.Credential.new_script(
        CML.ScriptHash.from_hex(stakeCredential.hash),
    );
    const certBuilder = buildCert(credential);

    const script = config.scripts.get(stakeCredential.hash)!;

    const red = redeemer!

    config.txBuilder.add_cert(
        certBuilder.plutus_script(
            toPartial(toV3(script.script), red),
            CML.Ed25519KeyHashList.new(),
        ),
    );

}

function toPartial(script: CML.PlutusScript, redeemer: string) {
    return CML.PartialPlutusWitness.new(
        CML.PlutusScriptWitness.new_script(script),
        CML.PlutusData.from_cbor_hex(redeemer),
    )
}

function toV3(script: string) {
    return CML.PlutusScript.from_v3(CML.PlutusV3Script.from_cbor_hex(script));
}

function setCollateral(
    config: TxBuilderConfig,
    collateralInputs: UTxO[],
    changeAddress: string,
) {
    for (const utxo of collateralInputs) {
        const collateralInput =
            CML.SingleInputBuilder.from_transaction_unspent_output(
                utxoToCore(utxo),
            ).payment_key();
        config.txBuilder.add_collateral(collateralInput);
    }
    const returnassets = pipe(
        sumAssetsFromInputs(collateralInputs),
        Record.union({ lovelace: -5_000_000n }, _BigInt.sum),
    );

    const collateralOutputBuilder =
        CML.TransactionOutputBuilder.new().with_address(
            CML.Address.from_bech32(changeAddress),
        );
    config.txBuilder.set_collateral_return(
        collateralOutputBuilder
            .next()
            .with_value(assetsToValue(returnassets))
            .build()
            .output(),
    );
}

function findCollateral(
    coinsPerUtxoByte: bigint,
    inputs: UTxO[],
): UTxO[] {
    // NOTE: While the required collateral is 5 ADA, there may be instances where the UTXOs encountered do not contain enough ADA to be returned to the collateral return address.
    // For example:
    // A UTXO with 5.5 ADA will result in an error message such as `BabbageOutputTooSmallUTxO`, since only 0.5 ADA would be returned to the collateral return address.
    const collateralLovelace: Assets = { lovelace: 5_000_000n };
    const error =
        `Your wallet does not have enough funds to cover the required 5 ADA collateral. Or it contains UTxOs with reference scripts; which
        are excluded from collateral selection.`
        ;
    const selected = recursive(
        sortUTxOs(inputs),
        collateralLovelace,
        coinsPerUtxoByte,
        undefined,
        error,
    );

    if (selected.length > 3)
        throw new Error(
            `Selected ${selected.length} inputs as collateral, but max collateral inputs is 3 to cover the 5 ADA collateral ${stringify(selected)}`,
        );
    return selected;
}

function recursive(
    inputs: UTxO[],
    requiredAssets: Assets,
    coinsPerUtxoByte: bigint,
    externalAssets: Assets = {},
    error?: string,
) {
    let selected: UTxO[] = [];
    error ??=
        `Your wallet does not have enough funds to cover the required assets: ${stringify(requiredAssets)}
        Or it contains UTxOs with reference scripts; which are excluded from coin selection.`;
    if (!Record.isEmptyRecord(requiredAssets)) {
        selected = selectUTxOs(inputs, requiredAssets);
        if (_Array.isEmptyArray(selected)) throw new Error(error);
        error;
    }

    const selectedAssets: Assets = sumAssetsFromInputs(selected);
    let availableAssets: Assets = pipe(
        selectedAssets,
        Record.union(requiredAssets, (self, that) => self - that),
        Record.union(externalAssets, _BigInt.sum),
    );

    let extraLovelace: Assets | undefined = getMinAda(availableAssets, coinsPerUtxoByte)
    let remainingInputs = inputs;

    while (extraLovelace) {
        remainingInputs = _Array.differenceWith(isEqualUTxO)(
            remainingInputs,
            selected,
        );

        const extraSelected = selectUTxOs(remainingInputs, extraLovelace);
        if (_Array.isEmptyArray(extraSelected)) {
            throw new Error(
                `Your wallet does not have enough funds to cover required minimum ADA for change output: ${stringify(extraLovelace)}
            Or it contains UTxOs with reference scripts; which are excluded from coin selection.`,
            );
        }
        const extraSelectedAssets: Assets = sumAssetsFromInputs(extraSelected);
        selected = [...selected, ...extraSelected];
        availableAssets = Record.union(
            availableAssets,
            extraSelectedAssets,
            _BigInt.sum,
        );

        extraLovelace = getMinAda(availableAssets, coinsPerUtxoByte)
    }
    return selected;
}

function sumAssetsFromInputs(inputs: UTxO[]) {
    return _Array.isEmptyArray(inputs)
        ? {}
        : inputs
            .map((utxo) => utxo.assets)
            .reduce((acc, cur) => Record.union(acc, cur, _BigInt.sum));
}

function calculateExtraLovelace(
    leftoverAssets: Assets,
    coinsPerUtxoByte: bigint,
    changeAddress?: string,
    datum?: string,
): Option.Option<Assets> {
    return pipe(leftoverAssets, (assets) => {
        const minLovelace = calculateMinLovelace(coinsPerUtxoByte, assets, changeAddress, datum);
        const currentLovelace = assets["lovelace"] || 0n;
        return currentLovelace >= minLovelace
            ? Option.none()
            : Option.some({ lovelace: minLovelace - currentLovelace });
    });
}

function calculateMinLovelace(
    coinsPerUtxoByte: bigint,
    multiAssets?: Assets,
    changeAddress?: string,
    datum?: string,
) {
    const dummyAddress =
        "addr_test1qrngfyc452vy4twdrepdjc50d4kvqutgt0hs9w6j2qhcdjfx0gpv7rsrjtxv97rplyz3ymyaqdwqa635zrcdena94ljs0xy950";
    let outputBuilder = CML.TransactionOutputBuilder.new()
        .with_address(
            CML.Address.from_bech32(changeAddress ? changeAddress : dummyAddress),
        );
    if (datum) {
        outputBuilder = outputBuilder.with_data(CML.DatumOption.new_datum(CML.PlutusData.from_cbor_hex(datum)))
    }
    return outputBuilder.next()
        .with_asset_and_min_required_coin(
            multiAssets
                ? assetsToValue(multiAssets).multi_asset()
                : CML.MultiAsset.new(),
            coinsPerUtxoByte,
        )
        .build()
        .output()
        .amount()
        .coin();
}

export async function generateProof(txBody: CML.TransactionBody, zkInput: ZkInput) {
    const { userId, hash, pwd } = zkInput;

    if (!pwd) {
        throw new Error('Password is required');
    }

    console.log("Tx Body:", txBody.to_json())
    const challengeId = serialiseBody(txBody);
    console.log('serialise (challenge id):', challengeId.toUpperCase());
    const numChallenge = BigInt(`0x${challengeId}`);

    const [cirChallenge, overflow] = numChallenge > r ? [(numChallenge % r).toString(), "1"] : [numChallenge.toString(), "0"];
    // challenge for circuit
    console.log('Challenge (in circuit)', cirChallenge, overflow);

    const numUserId = BigInt(`0x${userId}`).toString() // decimal number
    const numPwd = BigInt(`0x${pwd}`).toString() // decimal number
    const numCredentialHash = BigInt(`0x${hash}`).toString() // decimal number
    // const challenge = cirChallenge.toString(); // decimal number

    // calculate hash
    const numHash = await circuitHashWithCircom("poseidon_hash_circuit.circom", [numPwd, numUserId, numCredentialHash, cirChallenge, overflow])

    // TODO: use new challengeId to build zkProof so the evaluation pass (update pA, pB, pC)
    console.log('Circuit Full Signals:', {
        userId: numUserId,
        credentialHash: numCredentialHash,
        challenge: cirChallenge,
        challengeFlag: overflow,
        circuitHash: numHash,
        pwd: numPwd
    });

    const { proof } = await generate({
        userId: numUserId,
        credentialHash: numCredentialHash,
        challenge: cirChallenge,
        challengeFlag: overflow,
        circuitHash: numHash,
        pwd: numPwd
    });
    return [challengeId, numberToHex(numHash), ...proof];

}

async function buildRedeemer(txBody: CML.TransactionBody, zkInput: ZkInput, self_idx: number, idx: number, jdx: number) {
    const [challengeId, hash, pA, pB, pC] = await generateProof(txBody, zkInput);
    const redeemer = getSpendRedeemer(zkInput.userId, hash, challengeId, pA, pB, pC, self_idx, idx, jdx);
    return redeemer;
}

export function serialiseBody(txBody: CML.TransactionBody): string {
    // reference_inputs
    let txReferenceInputs: OutputReference[] = [];
    const txRefInputList = txBody.reference_inputs();
    if (txRefInputList) {
        txReferenceInputs = convertInputs(txRefInputList);
    }

    // inputs
    const txInputList = convertInputs(txBody.inputs());

    // outputs
    const txOutputList = convertOutputs(txBody.outputs());

    // mint
    const txMint = convertMint(txBody.mint());

    // certificates
    const txCertificates = convertCertificates(txBody.certs());

    // cbor serialise challenge
    const challenge = Data.to({
        reference_inputs: txReferenceInputs,
        inputs: txInputList,
        outputs: txOutputList,
        mint: txMint,
        certificates: txCertificates
    }, Challenge);
    console.log('serialise (challenge):', challenge.toUpperCase());
    const challengeId = CML.hash_plutus_data(CML.PlutusData.from_cbor_hex(challenge)).to_hex();
    return challengeId;
}

function convertCertificates(certs: CML.CertificateList | undefined): Certificate[] {
    const certificates: Certificate[] = [];
    if (certs) {
        for (let i = 0; i < certs.len(); i++) {
            const certificate = convertCertificate(certs.get(i));
            console.log("Cert:", Data.to(certificate, Certificate))
            certificates.push(certificate);
        }
    }
    return certificates;
}

function convertCertificate(cert: CML.Certificate): Certificate {
    switch (cert.kind()) {
        case CML.CertificateKind.StakeRegistration: {
            const c = cert.as_stake_registration()!;
            return {
                RegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    deposit: null
                }
            }
        }
        case CML.CertificateKind.StakeDeregistration: {
            const c = cert.as_stake_deregistration()!;
            return {
                UnRegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    refund: null
                }
            }
        }
        case CML.CertificateKind.StakeDelegation: {
            const c = cert.as_stake_delegation()!;
            return {
                DelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateBlockProduction: {
                            stake_pool: c.pool().to_hex()
                        }
                    }
                }
            }
        }
        case CML.CertificateKind.PoolRegistration: {
            const c = cert.as_pool_registration()!;
            const params = c.pool_params();
            return {
                RegisterStakePool: {
                    stake_pool: params.operator().to_hex(),
                    vrf: params.vrf_keyhash().to_hex()
                }
            }
        }
        case CML.CertificateKind.PoolRetirement: {
            const c = cert.as_pool_retirement()!;
            return {
                RetireStakePool: {
                    stake_pool: c.pool().to_hex(),
                    at_epoch: c.epoch()
                }
            }
        }
        case CML.CertificateKind.RegCert: {
            const c = cert.as_reg_cert()!;
            return {
                RegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    deposit: c.deposit()
                }
            }
        }
        case CML.CertificateKind.UnregCert: {
            const c = cert.as_unreg_cert()!;
            return {
                UnRegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    refund: c.deposit()
                }
            }
        }
        case CML.CertificateKind.VoteDelegCert: {
            console.log("Herererererererere!!!!")
            const c = cert.as_vote_deleg_cert()!;
            return {
                DelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateVote: {
                            delegate_representative: convertDRep(c.d_rep())
                        }
                    }
                }
            }
        }
        case CML.CertificateKind.StakeVoteDelegCert: {
            const c = cert.as_stake_vote_deleg_cert()!;
            return {
                DelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateBoth: {
                            stake_pool: c.pool().to_hex(),
                            delegate_representative: convertDRep(c.d_rep())
                        }
                    }
                }
            }
        }
        case CML.CertificateKind.StakeRegDelegCert: {
            const c = cert.as_stake_reg_deleg_cert()!;
            return {
                RegisterAndDelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateBlockProduction: {
                            stake_pool: c.pool().to_hex(),
                        }
                    },
                    deposit: c.deposit()
                }
            }
        }
        case CML.CertificateKind.VoteRegDelegCert: {
            const c = cert.as_vote_reg_deleg_cert()!;
            return {
                RegisterAndDelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateVote: {
                            delegate_representative: convertDRep(c.d_rep())
                        }
                    },
                    deposit: c.deposit()
                }
            }
        }

        case CML.CertificateKind.StakeVoteRegDelegCert: {
            const c = cert.as_stake_vote_reg_deleg_cert()!;
            return {
                RegisterAndDelegateCredential: {
                    credential: convertCredential(c.stake_credential()),
                    delegate: {
                        DelegateBoth: {
                            stake_pool: c.pool().to_hex(),
                            delegate_representative: convertDRep(c.d_rep())
                        }
                    },
                    deposit: c.deposit()
                }
            }
        }

        case CML.CertificateKind.AuthCommitteeHotCert: {
            const c = cert.as_auth_committee_hot_cert()!;
            return {
                AuthorizeConstitutionalCommitteeProxy: {
                    constitutional_committee_member: convertCredential(c.committee_cold_credential()),
                    proxy: convertCredential(c.committee_hot_credential())
                }
            }
        }

        case CML.CertificateKind.ResignCommitteeColdCert: {
            const c = cert.as_resign_committee_cold_cert()!;
            return {
                RetireFromConstitutionalCommittee: {
                    constitutional_committee_member: convertCredential(c.committee_cold_credential())
                }
            }
        }

        case CML.CertificateKind.RegDrepCert: {
            const c = cert.as_reg_drep_cert()!;
            return {
                RegisterDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential()),
                    deposit: c.deposit()
                }
            }
        }

        case CML.CertificateKind.UnregDrepCert: {
            const c = cert.as_unreg_drep_cert()!;
            return {
                UnregisterDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential()),
                    refund: c.deposit()
                }
            }
        }

        case CML.CertificateKind.UpdateDrepCert: {
            const c = cert.as_update_drep_cert()!;
            return {
                UpdateDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential())
                }
            }
        }

    }
}

function convertDRep(drep: CML.DRep): DelegateRepresentative {
    console.log("HRERERERERERERERERER", drep.as_key()!.to_hex())
    switch (drep.kind()) {
        case CML.DRepKind.Key:
            return {
                Registered: [{
                    VerificationKey: [drep.as_key()!.to_hex()]
                }]
            }

        case CML.DRepKind.Script:
            return {
                Registered: [{
                    Script: [drep.as_script()!.to_hex()]
                }]
            }

        case CML.DRepKind.AlwaysAbstain:
            return {
                AlwaysAbstain: "AlwaysAbstain"
            }

        case CML.DRepKind.AlwaysNoConfidence:
            return {
                AlwaysNoConfidence: "AlwaysNoConfidence"
            }
    }
}

function convertCredential(credential: CML.Credential): ContractCredential {
    const type = credential.kind();
    switch (type) {
        case CML.CredentialKind.PubKey:
            return {
                VerificationKey: [credential.as_pub_key()!.to_hex()]
            }

        case CML.CredentialKind.Script:
            return {
                Script: [credential.as_script()!.to_hex()]
            }
    }
}

function convertMint(mint: CML.Mint | undefined, canonical = true): string {
    if (mint) {
        const map = new Map<string, Map<string, bigint>>();
        const policies = mint.keys();
        for (let i = 0; i < policies.len(); i++) {
            const policy = policies.get(i);
            const policyId = policy.to_hex();
            const assets = mint.get_assets(policy);
            if (assets) {
                const policyMap = new Map<string, bigint>();
                const assetNameList = assets.keys();
                for (let j = 0; j < assetNameList.len(); j++) {
                    const assetName = assetNameList.get(j);
                    const quantity = mint.get(policy, assetName);
                    if (quantity) {
                        policyMap.set(assetName.to_hex(), quantity);
                    }
                }
                if (policyMap.size > 0) {
                    map.set(policyId, policyMap);
                }
            }
        }
        return Data.to(map, Value, { canonical });
    }
    return "A0"; // empty map
}

function convertInputs(txInputList: CML.TransactionInputList): OutputReference[] {
    const txReferenceInputs: OutRef[] = [];
    for (let i = 0; i < txInputList.len(); i++) {
        const input = txInputList.get(i);
        txReferenceInputs.push({
            txHash: input.transaction_id().to_hex(),
            outputIndex: Number(input.index())
        });
    }
    return sortOutRefs(txReferenceInputs).map(out => ({ transaction_id: out.txHash, output_index: BigInt(out.outputIndex) }))
}

function sortOutRefs(outs: OutRef[]): OutRef[] {
    return sortUTxOs(outs.map(out => ({...out, address: "", assets: {}})), "Canonical")
}

function convertOutputs(outputs: CML.TransactionOutputList): ChallengeOutput[] {
    const txOutputs: ChallengeOutput[] = [];
    for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i);
        console.log('Output', output.to_json());

        const address = getChallengeAddress(output.address().to_bech32()); // [TECH DEBT]: use Address object directly
        const value = getChallengeValue(output.amount());
        const datum = getChallengeDatum(output.datum());
        const referenceScript = getChallengeScriptReference(output.script_ref());
        txOutputs.push({
            address,
            value,
            datum,
            reference_script: referenceScript
        })
    }
    return txOutputs;
}

function getChallengeValue(value: CML.Value, canonical = true): string {
    const map = new Map<string, Map<string, bigint>>([["", new Map<string, bigint>([["", value.coin()]])]]);
    if (value.has_multiassets()) {
        const multiassets = value.multi_asset();
        const policies = multiassets.keys();
        for (let i = 0; i < policies.len(); i++) {
            const policy = policies.get(i);
            const policyId = policy.to_hex();
            const assets = multiassets.get_assets(policy);
            if (assets && !assets.is_empty()) {
                const policyMap = new Map<string, bigint>();
                const assetNameList = assets.keys();
                for (let j = 0; j < assetNameList.len(); j++) {
                    const assetName = assetNameList.get(j);
                    const quantity = multiassets.get(policy, assetName);
                    if (quantity) {
                        policyMap.set(assetName.to_hex(), quantity);
                    }
                }
                if (policyMap.size > 0) {
                    map.set(policyId, policyMap);
                }
            }

        }
    }
    return Data.to(map, Value, { canonical });
}

function getChallengeDatum(datum: CML.DatumOption | undefined): string {
    if (datum) {
        if (datum.as_hash()) {
            return datum.as_hash()!.to_hex();
        } else if (datum.as_datum()) {
            return CML.hash_plutus_data(datum.as_datum()!).to_hex();
        }
    }
    return "";
}

function getChallengeScriptReference(script: CML.Script | undefined): string | null {
    if (script) {
        return script.hash().to_hex();
    }
    return null;
}

function getChallengeAddress(addr: string): Address {
    const addressInfo = getAddressDetails(addr);
    const paymentHash = addressInfo.paymentCredential!.hash;
    const paymentType = addressInfo.paymentCredential?.type;
    const stakeHash = addressInfo.stakeCredential?.hash;
    const stakeType = addressInfo.stakeCredential?.type;
    const paymentCredential: ContractCredential = paymentType == "Key" ?
        { VerificationKey: [paymentHash] } : { Script: [paymentHash] };
    const stakeCredential: StakeCredential | null = addressInfo.stakeCredential ? stakeType == "Key" ?
        { Inline: [{ VerificationKey: [stakeHash!] }] } : { Inline: [{ Script: [stakeHash!] }] } : null;
    const address: Address = {
        payment_credential: paymentCredential,
        stake_credential: stakeCredential
    };
    return address;
}

function getValue(assets: Assets): Value {
    const value = new Map<string, Map<string, bigint>>();

    for (const [k, v] of Object.entries(assets)) {
        const [policyId, assetName] = k == "lovelace" ? ["", ""] : [k.slice(0, 56), k.slice(56)];
        if (!value.has(policyId)) {
            value.set(policyId, new Map<string, bigint>());
        }
        const assetMap = value.get(policyId)!;
        if (!assetMap.has(assetName)) {
            assetMap.set(assetName, v);
        } else {
            const currentValue = assetMap.get(assetName)!;
            assetMap.set(assetName, currentValue + v);
        }
    }
    const serialise = Data.to(value, Value, { canonical: true });

    return Data.from(serialise, Value);
}

function getDatum(dataHash?: string | null, data?: string | null): Datum {
    if (dataHash) {
        return { DatumHash: [dataHash] };
    } else if (data) {
        const datum = Data.from(data);
        return { InlineDatum: [datum] }
    } else {
        return { NoDatum: "NoDatum" }
    }
}

export function buildDrep(drep: DRepresentative): DRep {
    switch (drep.type) {
        case "Key":
        case "Script": {
            return {
                type: drep.type,
                hash: drep.hash!
            }
        }
        case "AlwaysAbstain": {
            return { __typename: "AlwaysAbstain" }
        }
        case "AlwaysNoConfidence": {
            return { __typename: "AlwaysNoConfidence" }
        }
        default: {
            throw new Error(`invalid drep type: ${drep.type}`)
        }
    }
}
