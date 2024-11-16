import { applyDoubleCborEncoding, applyParamsToScript, Data, MintingPolicy, Network, SpendingValidator, Credential, validatorToAddress, validatorToScriptHash, Blockfrost, Lucid, getAddressDetails, UTxO, Assets, CML, TxBuilderConfig, Wallet, utxoToTransactionInput, utxoToTransactionOutput, SLOT_CONFIG_NETWORK, LucidEvolution, Script, makeTxSignBuilder, TxBuilderError, stringify, isEqualUTxO, selectUTxOs, assetsToValue, sortUTxOs, utxoToCore, EvalRedeemer, toCMLRedeemerTag, PROTOCOL_PARAMETERS_DEFAULT, createCostModels, CertificateValidator, validatorToRewardAddress, PoolId, TxSignBuilder, PolicyId, Lovelace, CBORHex, RedeemerTag } from "@lucid-evolution/lucid";
import * as UPLC from "@lucid-evolution/uplc";
import blueprint from "../plutus.json" assert { type: 'json' };
import { Address, Certificate, Challenge, ChallengeOutput, Credential as ContractCredential, Datum, DelegateRepresentative, Input, Mint, Output, OutputReference, Proof, PublishRedeemer, Redeemer, ReferenceInputs, Signals, Spend, StakeCredential, Value, WithdrawRedeemer, ZkDatum } from "./contract-types";
import * as fs from 'fs';
import { pipe, Record, Array as _Array, BigInt as _BigInt, Option } from "effect";
import { generate } from "./zkproof";

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

// const lucid = await Lucid(
//     new Blockfrost(
//         "https://cardano-preview.blockfrost.io/api/v0",
//         "preview1OQSKlQ6tb3WYBx9bqlz7kDFhuglmfvL"
//     ),
//     "Preview"
// );

// const prvKey = fs.readFileSync('./src/me.sk').toString();
// lucid.selectWallet.fromPrivateKey(prvKey);
// const walletAddress = await lucid.wallet().address();
// const walletPaymentHash = getAddressDetails(walletAddress).paymentCredential!.hash;
// const walletStakeHash = getAddressDetails(walletAddress).stakeCredential?.hash;

export function generateMintPolicy(mint_script: string, nonce?: string) {
    const params = Data.to({
        nonce: nonce || randomNonce()
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

    return {
        mint,
        policyId,
    };
}

export function generateSpendScript(
    spend_script: string,
    // policy: Policy,
    // credential: Credential,
    network: Network,
    policyId: string,
    assetName: string,
    forEvaluation = false,
) {

    const params = Data.to({
        policyId,
        assetName,
        forEvaluation: forEvaluation
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

export function generatePublishValidator(
    publish_script: string,
    network: Network,
    policyId: string,
    assetName: string,
    forEvaluation = false,
) {
    const params = Data.to({
        policyId,
        assetName,
        forEvaluation: forEvaluation
    }, Spend);
    const publishParams = Data.from(params);
    console.log('Publish params:', params);
    console.log('Publish params:', Data.to(publishParams));


    const publish: CertificateValidator = {
        type: "PlutusV3",
        script: applyParamsToScript(applyDoubleCborEncoding(publish_script),
            [
                publishParams
            ],
        )
    };

    const rewardAddress = validatorToRewardAddress(network, publish);
    return {
        publish,
        rewardAddress
    }
}

export const r = 52435875175126190479447740508185965837690552500527637822603658699938581184513n

export function getSpendRedeemer(userId: string, pwdHash: string, challenge: string, pA: string, pB: string, pC: string) {
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
function evalTransaction(
    config: TxBuilderConfig,
    tx: CML.Transaction,
    walletInputs?: UTxO[],
    extraIncrements?: Map<CML.RedeemerTag, Map<number, number>>,
): ScriptEvaluation[] {
    const txEvaluation = setRedeemerstoZero(tx)!;
    // const txEvaluation = tx;
    const txUtxos = [
        ...(walletInputs || []),
        ...config.collectedInputs,
        ...config.readInputs,
    ];
    const ins = txUtxos.map((utxo) => utxoToTransactionInput(utxo));
    const outs = txUtxos.map((utxo) => utxoToTransactionOutput(utxo));
    const slotConfig = SLOT_CONFIG_NETWORK[config.lucidConfig.network];
    try {
        const uplcEval = UPLC.eval_phase_two_raw(
            txEvaluation.to_cbor_bytes(),
            ins.map((value) => value.to_cbor_bytes()),
            outs.map((value) => value.to_cbor_bytes()),
            // config.lucidConfig.costModels.to_cbor_bytes(),
            createCostModels(PROTOCOL_PARAMETERS_DEFAULT.costModels).to_cbor_bytes(),
            config.lucidConfig.protocolParameters.maxTxExSteps,
            config.lucidConfig.protocolParameters.maxTxExMem,
            BigInt(slotConfig.zeroTime),
            BigInt(slotConfig.zeroSlot),
            slotConfig.slotLength,
        );
        const increments = extraIncrements || new Map<CML.RedeemerTag, Map<number, number>>();
        return uplcEval.map(bytes => {
            const redeemer = CML.LegacyRedeemer.from_cbor_bytes(bytes);
            const tag =  redeemer.tag();
            const index = redeemer.index();
            
            const increment = 1 + getRedeemerIncrement(increments, tag, Number(index));
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
        console.log(JSON.stringify(error)
            .replace(/\\n\s*/g, " ")
            .trim());
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
    // const txEvaluation = tx;
    try {
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
        console.log(JSON.stringify(error)
            .replace(/\\n\s*/g, " ")
            .trim());
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
    for (const {tag, index, exUnits} of uplcEval) {
        txBuilder.set_exunits(CML.RedeemerWitnessKey.new(tag, index), exUnits);
    }

    txBuilder.add_change_if_needed(CML.Address.from_bech32(changeAddress), true);
}

function getEvalIncrements(scriptIncrements: ScriptIncrements[] | undefined, txBuilder: CML.TransactionBuilder): Map<CML.RedeemerTag, Map<number, number>> {
    const map = new Map<CML.RedeemerTag, Map<number, number>>();
    if (scriptIncrements) {
        for(const { tag, increment, scriptHash } of scriptIncrements) {
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
    hash: string,
    pwd: string,
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

// const evalZkProof = {
//     userId: "73EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000000", // scalar.field_prime - 1
//     pwdHash: "73EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000000", // scalar.field_prime - 1
//     // Guarantee overflow logic is executed and final value scalar.field_prime - 1, since number is 2 * scalar.field_prime - 1 
//     challenge: "E7DB4EA6533AFA906673B0101343B00AA77B4805FFFCB7FDFFFFFFFE00000001", 
//     pA: "af46f51c9067ff3f6ae57ba0f76d9de33e979d01c0f91a40fc600f467b8fd0a3804d1968c2836632d728450b5d2614d4",
//     pB: "816dc1b644722dcaf92aba79949fb514b19f0289dec36e9d49e9fec755244636e321ac6e6d37cc78381fc37eced6e5d7057e8187d6fd098df9647146154565800cbd3f64a809bb4e565416c967c60ad6e32f83a9def38b0ad5ba826ec45a1e0a",
//     pC: "8881425d2cf63d3e019a4eb858b79d536804ce76ee499dc562cf0bac94db104963f7599c96ee98b2f47c58a780c62980"
// }
// TODO: use more complexity point sin the curve (closer to field upper bound 2^381-1)
// Then run stress-test to determine a empirical maximum eval proof, meaning will returm bigger exUnits.
// Apply a 5-10% to increase the likelihood of having an upper bound exUnit
const evalZkProof = {
    userId: "466f6e74757323303030",
    pwdHash: BigInt("10343661163184219313272354919635983875711247223011266158462328948931637363678").toString(16),
    challenge: "B2005F8E22E380F580A3E2378F3AE546A95E4BB9B30BCA6A67F22A9607C65461",
    pA: "af46f51c9067ff3f6ae57ba0f76d9de33e979d01c0f91a40fc600f467b8fd0a3804d1968c2836632d728450b5d2614d4",
    pB: "816dc1b644722dcaf92aba79949fb514b19f0289dec36e9d49e9fec755244636e321ac6e6d37cc78381fc37eced6e5d7057e8187d6fd098df9647146154565800cbd3f64a809bb4e565416c967c60ad6e32f83a9def38b0ad5ba826ec45a1e0a",
    pC: "8881425d2cf63d3e019a4eb858b79d536804ce76ee499dc562cf0bac94db104963f7599c96ee98b2f47c58a780c62980"
}

type SpendTxParams = {
    lucid: LucidEvolution,
    reference_inputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    lovelace: bigint,
    validTo: number,
    walletAddress: string,
    zkInput: ZkInput,
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
    reference_inputs: UTxO[],
    inputs: UTxO[],
    redeemers: string[],
    scripts: Script[],
    spendAddress: string,
    rewardAddress: string,
    poolId: PoolId,
    validTo: number,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    evalRedeemers?: string[],
    evalScripts?: Script[],
    scriptIncrements?: ScriptIncrements[],
    options?: CompleteOptions
}

type TxBuilderParams = SpendTxParams | StakeAndDelegateTxParams;

async function buildTx(
    params: TxBuilderParams,
    makeTxBuilderConfig: (params: TxBuilderParams) => Promise<TxBuilderConfig>,
    makeEvalInputs: (network: Network, policyId: PolicyId, tokenName: string, scripts?: Script[]) => UTxO[],
    makeFinalRdeemers: (tx: CML.TransactionBody, zkInput: ZkInput) => Promise<string[]>,
): Promise<TxSignBuilder> {
    const { inputs, walletAddress, zkInput, options, network, policyId, tokenName, evalRedeemers, evalScripts, scriptIncrements } = params;
    const evalInputs = makeEvalInputs(network, policyId, tokenName, evalScripts);

    // get evaluation tx
    let config = await makeTxBuilderConfig({
        ...params,
        inputs: evalInputs,
        evalRedeemers: evalRedeemers,
        evalScripts: evalScripts
    });
    const walletInfo = await getWalletInfo(config);
    const collateralInput = findCollateral(config.lucidConfig.protocolParameters.coinsPerUtxoByte, walletInfo.inputs);

    // Set collateral input if there are script executions
    setCollateral(config, collateralInput, walletInfo.address);

    // get a new txRedeemerBuilder based on updated redeemer with the challenge for evaluation
    let txRedeemerBuilder = config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(walletAddress));
    const increments = getEvalIncrements(scriptIncrements, config.txBuilder);
    let uplcEval: ScriptEvaluation[] = [];
    if (options?.localUPLCEval !== false) {
        uplcEval = evalTransaction(config, txRedeemerBuilder.draft_tx(), evalInputs, increments);
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
    setCollateral(config, collateralInput, walletInfo.address);

    // update txBuilder exUnits and 
    // adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // tx has now final inputs and outputs
    // get final redeemer with the challenge for final tx
    const finalRedeemers = await makeFinalRdeemers(config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(walletAddress)).draft_body(), zkInput)

    config = await makeTxBuilderConfig({ ...params, redeemers: finalRedeemers, evalRedeemers: undefined, evalScripts: undefined });

    // Set collateral input if there are script executions
    setCollateral(config, collateralInput, walletInfo.address);

    // update txBuilder exUnits and 
    // adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // final build
    let tx = config.txBuilder
        .build(
            CML.ChangeSelectionAlgo.Default,
            CML.Address.from_bech32(walletAddress),
        )
        .build_unchecked();

    return makeTxSignBuilder(config.lucidConfig, tx);
}

export async function spendTx(
    lucid: LucidEvolution,
    reference_inputs: UTxO[],
    inputs: UTxO[],
    spendAddress: string,
    spend: Script,
    lovelace: bigint,
    validTo: number,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    options?: CompleteOptions) {

    // get for validation script
    const { spend: evalSpend, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName, true);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpend.script))
        .hash()
        .to_hex());

    const evalInputs = inputs.map(input => {
        if (input.address === spendAddress) {
            return {
                ...input,
                txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                // txHash: "29e0b0742664ea8f8aacd4696323146c5e4685b92d98a2982fdf561e71918262", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                // outputIndex: 2,
                address: evalSpendAddress
            }
        }
        return input;
    });
    const { userId, pwdHash, challenge, pA, pB, pC } = evalZkProof;
    const evalRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC);

    // get evaluation tx
    let config = await makeTxBuilderConfig(lucid, reference_inputs, evalInputs, evalRedeemer, evalSpend, walletAddress, lovelace, validTo);
    const walletInfo = await getWalletInfo(config);

    let hasScriptExecutions = config.scripts.size > 0;
    // Set collateral input if there are script executions
    if (hasScriptExecutions) {
        const collateralInput = findCollateral(
            config.lucidConfig.protocolParameters.coinsPerUtxoByte,
            walletInfo.inputs,
        );
        setCollateral(config, collateralInput, walletInfo.address);
    }

    // get a new txRedeemerBuilder based on updated redeemer with the challenge for evaluation
    let txRedeemerBuilder = config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(walletAddress));

    let uplcEval: ScriptEvaluation[] = [];
    if (options?.localUPLCEval !== false) {
        uplcEval = evalTransaction(config, txRedeemerBuilder.draft_tx(), evalInputs);
    } else {
        uplcEval = await evalTransactionProvider(config, txRedeemerBuilder.draft_tx(), evalInputs);
        // uplcEval[0].ex_units.mem = 8455482;
        // uplcEval[0].ex_units.steps = 5283365186;
    }

    // update txBuilder exUnits and adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // get final tx (original inputs but still fake redeemer). We do this to have all inputs and outputs and 
    // then calculate challenge
    config = await makeTxBuilderConfig(lucid, reference_inputs, inputs, evalRedeemer, spend, walletAddress, lovelace, validTo);

    hasScriptExecutions = config.scripts.size > 0;
    // Set collateral input if there are script executions
    if (hasScriptExecutions) {
        const collateralInput = findCollateral(
            config.lucidConfig.protocolParameters.coinsPerUtxoByte,
            walletInfo.inputs,
        );
        setCollateral(config, collateralInput, walletInfo.address);
    }

    // update txBuilder exUnits and adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // tx has now final inputs and  outputs
    // get final redeemer with the challenge for final tx
    let redeemer = await buildRedeemer(config.txBuilder.build_for_evaluation(CML.ChangeSelectionAlgo.Default, CML.Address.from_bech32(walletAddress)).draft_body(), zkInput);
    config = await makeTxBuilderConfig(lucid, reference_inputs, inputs, redeemer, spend, walletAddress, lovelace, validTo);

    // Set collateral input if there are script executions
    if (hasScriptExecutions) {
        const collateralInput = findCollateral(
            config.lucidConfig.protocolParameters.coinsPerUtxoByte,
            walletInfo.inputs,
        );
        setCollateral(config, collateralInput, walletInfo.address);
    }

    // update txBuilder exUnits and adjust tx inputs and outputs
    applyUPLCEval(uplcEval, config.txBuilder, walletAddress);

    // final build
    let tx = config.txBuilder
        .build(
            CML.ChangeSelectionAlgo.Default,
            CML.Address.from_bech32(walletAddress),
        )
        .build_unchecked();

    const txSignBuilder = makeTxSignBuilder(config.lucidConfig, tx);
    const txSigned = await txSignBuilder.sign.withWallet().complete();

    console.log('cbor', txSigned.toCBOR());
    // console.log('cbor (canonical)', txSigned.toCBOR({ canonical: true }));
    console.log('Tx Id:', txSigned.toHash());

    // const txHash = await txSigned.submit();
    // console.log('Tx Id (Submit):', txHash);
    // const success = await lucid.awaitTx(txHash);
    // console.log('Success?', success);
}

export async function registerAndDelegateTx(
    lucid: LucidEvolution,
    reference_inputs: UTxO[],
    inputs: UTxO[],
    rewardAddress: string,
    stake: Script,
    spendAddress: string,
    spend: Script,
    poolId: PoolId,
    validTo: number,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    options?: CompleteOptions) {

    const publish: PublishRedeemer = "RegisterAndDelegate";
    const publishRedeemer = Data.to(publish, PublishRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName, true);
    const { publish: evalPublishScript, rewardAddress: evalRewardAddress } = generatePublishValidator(validators.publish.script, network, policyId, tokenName, true);
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Spend Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());
    console.log('Eval Publish Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalPublishScript.script)).hash().to_hex());

    const { userId, pwdHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC);

    const params: StakeAndDelegateTxParams = {
        lucid,
        reference_inputs,
        inputs,
        redeemers: [publishRedeemer, ""],
        scripts: [stake, spend],
        spendAddress,
        rewardAddress,
        poolId,
        validTo,
        walletAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [publishRedeemer, evalSpendRedeemer],
        evalScripts: [evalPublishScript, evalSpendScript],
        options,
    };

    const txSignBuilder = await buildTx(params, (params) => {
        const { lucid, reference_inputs, inputs, redeemers, poolId, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as StakeAndDelegateTxParams;
        const [rRedeemer, sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeRegisterStakeTxBuilderConfig(lucid, reference_inputs, inputs, rRedeemer, sRedeemer, poolId, stakeScript, spendScript, rAddress, validTo)
    }, () => {
        const evalInputs = inputs.map(input => {
            if (input.address === spendAddress) {
                return {
                    ...input,
                    txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                    // txHash: "29e0b0742664ea8f8aacd4696323146c5e4685b92d98a2982fdf561e71918262", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                    // outputIndex: 2,
                    address: evalSpendAddress
                }
            }
            return input;
        });
        return evalInputs;
    }, async (tx: CML.TransactionBody, zkInput: ZkInput) => {
        let spendRedeemer = await buildRedeemer(tx, zkInput);
        return [publishRedeemer, spendRedeemer];
    });

    const txSigned = await txSignBuilder.sign.withWallet().complete();

    console.log('cbor', txSigned.toCBOR());
    console.log('Tx Id:', txSigned.toHash());

    const txHash = await txSigned.submit();
    console.log('Tx Id (Submit):', txHash);
    const success = await lucid.awaitTx(txHash);
    console.log('Success?', success);

}

export async function withdrawTx(
    lucid: LucidEvolution,
    reference_inputs: UTxO[],
    inputs: UTxO[],
    amount: Lovelace,
    rewardAddress: string,
    stake: Script,
    spendAddress: string,
    spend: Script,
    poolId: PoolId,
    validTo: number,
    walletAddress: string,
    zkInput: ZkInput,
    policyId: string,
    tokenName: string,
    network: Network,
    options?: CompleteOptions) {

    const withdraw: WithdrawRedeemer = "Withdraw";
    const withdrawRedeemer = Data.to(withdraw, WithdrawRedeemer);

    // get for validation script
    const { spend: evalSpendScript, spendAddress: evalSpendAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName, true);
    const { publish: evalPublishScript, rewardAddress: evalRewardAddress } = generatePublishValidator(validators.publish.script, network, policyId, tokenName, true);
    const scriptIncrements: ScriptIncrements[] = [
        // { 
        //     tag: CML.RedeemerTag.Spend, 
        //     increment: 0.10, 
        //     scriptHash: CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex()
        // }
    ];
    console.log('Eval Spend Address:', evalSpendAddress);
    console.log('Eval Reward Address:', evalRewardAddress);
    console.log('Eval Spend Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalSpendScript.script)).hash().to_hex());
    console.log('Eval Publish Script hash', CML.PlutusV3Script.from_cbor_hex(applyDoubleCborEncoding(evalPublishScript.script)).hash().to_hex());

    const { userId, pwdHash, challenge, pA, pB, pC } = evalZkProof;
    const evalSpendRedeemer = getSpendRedeemer(userId, pwdHash, challenge, pA, pB, pC);

    const params: StakeAndDelegateTxParams = {
        lucid,
        reference_inputs,
        inputs,
        redeemers: [withdrawRedeemer, ""],
        scripts: [stake, spend],
        spendAddress,
        rewardAddress,
        poolId,
        validTo,
        walletAddress,
        zkInput,
        policyId,
        tokenName,
        network,
        evalRedeemers: [withdrawRedeemer, evalSpendRedeemer],
        evalScripts: [evalPublishScript, evalSpendScript],
        scriptIncrements,
        options,
    };

    const txSignBuilder = await buildTx(params, (params) => {
        const { lucid, reference_inputs, inputs, redeemers, poolId, scripts, rewardAddress, validTo, evalRedeemers, evalScripts } = params as StakeAndDelegateTxParams;
        const [rRedeemer, sRedeemer] = evalRedeemers || redeemers;
        const [stakeScript, spendScript] = evalScripts || scripts;
        const rAddress = evalScripts ? evalRewardAddress : rewardAddress
        return makeWithdrawTxBuilderConfig(lucid, reference_inputs, inputs, rRedeemer, sRedeemer, poolId, stakeScript, spendScript, rAddress, amount, validTo)
    }, () => {
        const evalInputs = inputs.map(input => {
            if (input.address === spendAddress) {
                return {
                    ...input,
                    txHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                    // txHash: "29e0b0742664ea8f8aacd4696323146c5e4685b92d98a2982fdf561e71918262", // this is to force the mock evaluation to use additional UTxOs. This way evaluation will refer to the "fake" script
                    // outputIndex: 2,
                    address: evalSpendAddress
                }
            }
            return input;
        });
        return evalInputs;
    }, async (tx: CML.TransactionBody, zkInput: ZkInput) => {
        let spendRedeemer = await buildRedeemer(tx, zkInput);
        return [withdrawRedeemer, spendRedeemer];
    });

    const txSigned = await txSignBuilder.sign.withWallet().complete();

    console.log('cbor', txSigned.toCBOR());
    console.log('Tx Id:', txSigned.toHash());

    const txHash = await txSigned.submit();
    console.log('Tx Id (Submit):', txHash);
    const success = await lucid.awaitTx(txHash);
    console.log('Success?', success);
}

function makeRegisterStakeTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], registerRedeemer: string, spendRedeemer: string, poolId: PoolId, stake: Script, spend: Script, rewardAddress: string, validTo: number) {
    return lucid
        .newTx()
        .readFrom(reference_inputs)
        .collectFrom(inputs, spendRedeemer)
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .registerAndDelegate.ToPool(rewardAddress, poolId, registerRedeemer)
        .validTo(validTo)
        .config();
}

function makeWithdrawTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], withdrawRedeemer: string, spendRedeemer: string, poolId: PoolId, stake: Script, spend: Script, rewardAddress: string, amount: Lovelace, validTo: number) {
    return lucid
        .newTx()
        .readFrom(reference_inputs)
        .collectFrom(inputs, spendRedeemer)
        .withdraw(rewardAddress, amount, withdrawRedeemer)
        .attach.CertificateValidator(stake)
        .attach.SpendingValidator(spend)
        .validTo(validTo)
        .config();

    // const buildCert = (credential: CML.Credential) =>
    //     CML.SingleCertificateBuilder.new(
    //       CML.Certificate.new_auth_committee_hot_cert(credential, hotCredential),
    //     );
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

    let extraLovelace: Assets | undefined = pipe(
        calculateExtraLovelace(availableAssets, coinsPerUtxoByte),
        Option.getOrUndefined,
    );
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

        extraLovelace = pipe(
            calculateExtraLovelace(availableAssets, coinsPerUtxoByte),
            Option.getOrUndefined,
        );
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
): Option.Option<Assets> {
    return pipe(leftoverAssets, (assets) => {
        const minLovelace = calculateMinLovelace(coinsPerUtxoByte, assets);
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
) {
    const dummyAddress =
        "addr_test1qrngfyc452vy4twdrepdjc50d4kvqutgt0hs9w6j2qhcdjfx0gpv7rsrjtxv97rplyz3ymyaqdwqa635zrcdena94ljs0xy950";
    return CML.TransactionOutputBuilder.new()
        .with_address(
            CML.Address.from_bech32(changeAddress ? changeAddress : dummyAddress),
        )
        .next()
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

async function generateProof(txBody: CML.TransactionBody, zkInput: ZkInput) {
    const { userId, hash, pwd } = zkInput;

    const challengeId = serialiseBody(txBody);
    console.log('serialise (challenge id):', challengeId.toUpperCase());
    const numChallenge = BigInt(`0x${challengeId}`);

    const [cirChallenge, _overflow] = numChallenge > r ? [numChallenge % r, 1] : [numChallenge, 0];
    // challenge for circuit
    console.log('Challenge (in circuit)', cirChallenge, _overflow);
    const numUserId = BigInt(`0x${userId}`).toString() // decimal number
    const numHash = BigInt(`0x${hash}`).toString() // decimal number
    // const challenge = cirChallenge.toString(); // decimal number

    // TODO: use new challengeId to build zkProof so the evaluation pass (update pA, pB, pC)
    console.log('Generarte proof for:', { userId: numUserId, challenge: cirChallenge, hash: numHash, pwd });

    const { proof } = await generate({ userId: numUserId, challenge: cirChallenge, hash: numHash, pwd });
    return [challengeId, ...proof];

}

async function buildRedeemer(txBody: CML.TransactionBody, zkInput: ZkInput) {
    const { userId, hash } = zkInput;
    const [challengeId, pA, pB, pC] = await generateProof(txBody, zkInput);

    const redeemer = getSpendRedeemer(userId, hash, challengeId, pA, pB, pC);
    return redeemer;
}

function makeTxBuilderConfig(lucid: LucidEvolution, reference_inputs: UTxO[], inputs: UTxO[], spendRedeemer: string, spend: Script, walletAddress: string, lovelace: bigint, validTo: number) {
    return lucid
        .newTx()
        .readFrom(reference_inputs)
        .collectFrom(inputs, spendRedeemer)
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
    switch (drep.kind()) {
        case CML.DRepKind.Key:
            return {
                Registered: {
                    VerificationKey: [drep.as_key()!.to_hex()]
                }
            }

        case CML.DRepKind.Script:
            return {
                Registered: {
                    Script: [drep.as_script()!.to_hex()]
                }
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
    const txReferenceInputs: OutputReference[] = [];
    for (let i = 0; i < txInputList.len(); i++) {
        const input = txInputList.get(i);
        txReferenceInputs.push({
            transaction_id: input.transaction_id().to_hex(),
            output_index: input.index()
        });
    }
    return txReferenceInputs;
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

// const validators = readValidators();
// const nonce = "9565b074c5c930aff80cac59a2278b70";
// const { mint, policyId, spendAddress } = generateSpendScript(validators.mint.script, validators.spend.script, "Preview", nonce);
// console.log('PolicyId:', policyId);
// console.log('Spend Script Address:', spendAddress);
// console.log('Mint Script:', mint);
