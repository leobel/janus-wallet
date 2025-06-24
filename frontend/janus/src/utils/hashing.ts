import initCredentials from './circuits/poseidon_hash_credential.wasm?init'
import symbolsContentCredentials from './circuits/poseidon_hash_credential.sym?raw'
import initCircuit from './circuits/poseidon_hash_circuit.wasm?init'
import symbolsContentCircuit from './circuits/poseidon_hash_circuit.sym?raw'
import bcrypt from "bcryptjs"
import { CML, Data, fromText, getAddressDetails, sortUTxOs, type Assets, type OutRef } from '@lucid-evolution/lucid'
import getCircuit from "./circuits/poseidon_hash_circuit"
import type { ZkInput } from "../models/zk-input"
import { Address, Challenge, ChallengeOutput, Certificate, Credential as ContractCredential, Datum, DelegateRepresentative, OutputReference, Proof, Redeemer, Signals, StakeCredential, Value } from "./contract-types"
import { generate } from './circuits/zk-proof'

export const r = 52435875175126190479447740508185965837690552500527637822603658699938581184513n

// kdf bcrypt password//
export async function hashPassword(pwd: string, salt?: string, rounds = 10): Promise<string> {
    const s = salt || await bcrypt.genSalt(rounds)
    const hash = await bcrypt.hash(pwd, s)

    console.log('salt:', s)
    console.log('salt rounds:', rounds)
    console.log('bcrypt hash:', hash)
    console.log('bcrypt hash (hex):', fromText(hash))

    return fromText(hash)

}

// Poseidon(pwd, username)
export async function hashCredentials(username: string, password: string,): Promise<string> {
    const pwd = fromText(password)
    const userId = fromText(username)
    const numPwd = BigInt(`0x${pwd}`).toString() // decimal number
    const numUserId = BigInt(`0x${userId}`).toString() // decimal number
    const inputs: string[] = [numPwd, numUserId]

    const circuit = await getCircuit(initCredentials, symbolsContentCredentials)
    const w = await circuit.calculateWitness({ inputs })
    const hash = w[circuit.symbols["main.out"].varIdx].toString()

    console.log("credential hash (number):", hash)
    console.log("credential hash:", numberToHex(hash))
    return numberToHex(hash)
}

export async function generateRedeemer(username: string, pwdHash: string, pwd: string, cborTx: string): Promise<string[]> {
    const zkInput: ZkInput = {
        userId: fromText(username),
        hash: pwdHash, // credential hash: Poseidon(pwd, username)
        pwd: fromText(pwd)
        // pwd: "12345"
    }

    const redeemer = await buildZKProofRedeemer(cborTx, zkInput, 0, 0, 0)

    // find how many spend redeemers are in the tx
    const tx = CML.Transaction.from_cbor_hex(cborTx)
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

function buildAllSpendRedeemers(redeemer: string, size: number): string[] {
    return [redeemer, ...Array.from({ length: size - 1 }, (_, i) => buildDummySpendReedemer(i + 1, 0))]
}

function buildDummySpendReedemer(self_idx: number, idx: number): string {
    const emptyRedeemer: Redeemer = {
        self_idx: BigInt(self_idx),
        idx: BigInt(idx),
        jdx: -1n,
        signals: null,
        proof: null
    }
    return Data.to(emptyRedeemer, Redeemer)
}

async function buildZKProofRedeemer(txCbor: string, zkInput: ZkInput, selfIdx: number, idx: number, jdx: number): Promise<string> {
    const txBody = CML.Transaction.from_cbor_hex(txCbor).body()
    const [challengeId, hash, pA, pB, pC] = await generateProof(txBody, zkInput)
    const redeemer = getSpendRedeemer(zkInput.userId, hash, challengeId, pA, pB, pC, selfIdx, idx, jdx)
    return redeemer
}

async function generateProof(txBody: CML.TransactionBody, zkInput: ZkInput) {
    const { userId, hash, pwd } = zkInput

    if (!pwd) {
        throw new Error('Password is required')
    }

    console.log("Tx Body:", txBody.to_json())
    const challengeId = serialiseBody(txBody)
    console.log('serialise (challenge id):', challengeId.toUpperCase())
    const numChallenge = BigInt(`0x${challengeId}`)

    const [cirChallenge, overflow] = numChallenge > r ? [(numChallenge % r).toString(), "1"] : [numChallenge.toString(), "0"]
    // challenge for circuit
    console.log('Challenge (in circuit)', cirChallenge, overflow)

    const numUserId = BigInt(`0x${userId}`).toString() // decimal number
    const numPwd = BigInt(`0x${pwd}`).toString() // decimal number
    const numCredentialHash = BigInt(`0x${hash}`).toString() // decimal number
    // const challenge = cirChallenge.toString() // decimal number

    // calculate hash
    const circuit = await getCircuit(initCircuit, symbolsContentCircuit)
    const inputs = [numPwd, numUserId, numCredentialHash, cirChallenge, overflow]
    const w = await circuit.calculateWitness({ inputs })
    const numHash = w[circuit.symbols["main.out"].varIdx].toString()

    // TODO: use new challengeId to build zkProof so the evaluation pass (update pA, pB, pC)
    console.log('Circuit Full Signals:', {
        userId: numUserId,
        credentialHash: numCredentialHash,
        challenge: cirChallenge,
        challengeFlag: overflow,
        circuitHash: numHash,
        pwd: numPwd
    })

    const { proof } = await generate({
        userId: numUserId,
        credentialHash: numCredentialHash,
        challenge: cirChallenge,
        challengeFlag: overflow,
        circuitHash: numHash,
        pwd: numPwd
    })
    return [challengeId, numberToHex(numHash), ...proof]

}

function getSpendRedeemer(userId: string, pwdHash: string, challenge: string, pA: string, pB: string, pC: string, selfIdx: number, idx: number, jdx: number) {
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

function serialiseBody(txBody: CML.TransactionBody): string {
    // reference_inputs
    let txReferenceInputs: OutputReference[] = []
    const txRefInputList = txBody.reference_inputs()
    if (txRefInputList) {
        txReferenceInputs = convertInputs(txRefInputList)
    }

    // inputs
    const txInputList = convertInputs(txBody.inputs())

    // outputs
    const txOutputList = convertOutputs(txBody.outputs())

    // mint
    const txMint = convertMint(txBody.mint())

    // certificates
    const txCertificates = convertCertificates(txBody.certs())

    // cbor serialise challenge
    const challenge = Data.to({
        reference_inputs: txReferenceInputs,
        inputs: txInputList,
        outputs: txOutputList,
        mint: txMint,
        certificates: txCertificates
    }, Challenge)
    console.log('serialise (challenge):', challenge.toUpperCase())
    const challengeId = CML.hash_plutus_data(CML.PlutusData.from_cbor_hex(challenge)).to_hex()
    return challengeId
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
    const txOutputs: ChallengeOutput[] = []
    for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i)
        console.log('Output', output.to_json())

        const address = getChallengeAddress(output.address().to_bech32()) // [TECH DEBT]: use Address object directly
        const value = getChallengeValue(output.amount())
        const datum = getChallengeDatum(output.datum())
        const referenceScript = getChallengeScriptReference(output.script_ref())
        txOutputs.push({
            address,
            value,
            datum,
            reference_script: referenceScript
        })
    }
    return txOutputs
}

function convertMint(mint: CML.Mint | undefined, canonical = true): string {
    if (mint) {
        const map = new Map<string, Map<string, bigint>>()
        const policies = mint.keys()
        for (let i = 0; i < policies.len(); i++) {
            const policy = policies.get(i)
            const policyId = policy.to_hex()
            const assets = mint.get_assets(policy)
            if (assets) {
                const policyMap = new Map<string, bigint>()
                const assetNameList = assets.keys()
                for (let j = 0; j < assetNameList.len(); j++) {
                    const assetName = assetNameList.get(j)
                    const quantity = mint.get(policy, assetName)
                    if (quantity) {
                        policyMap.set(assetName.to_hex(), quantity)
                    }
                }
                if (policyMap.size > 0) {
                    map.set(policyId, policyMap)
                }
            }
        }
        return Data.to(map, Value, { canonical })
    }
    return "A0" // empty map
}

function convertCertificates(certs: CML.CertificateList | undefined): Certificate[] {
    const certificates: Certificate[] = []
    if (certs) {
        for (let i = 0; i < certs.len(); i++) {
            const certificate = convertCertificate(certs.get(i))
            console.log("Cert:", Data.to(certificate, Certificate))
            certificates.push(certificate)
        }
    }
    return certificates
}

function convertCertificate(cert: CML.Certificate): Certificate {
    switch (cert.kind()) {
        case CML.CertificateKind.StakeRegistration: {
            const c = cert.as_stake_registration()!
            return {
                RegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    deposit: null
                }
            }
        }
        case CML.CertificateKind.StakeDeregistration: {
            const c = cert.as_stake_deregistration()!
            return {
                UnRegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    refund: null
                }
            }
        }
        case CML.CertificateKind.StakeDelegation: {
            const c = cert.as_stake_delegation()!
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
            const c = cert.as_pool_registration()!
            const params = c.pool_params()
            return {
                RegisterStakePool: {
                    stake_pool: params.operator().to_hex(),
                    vrf: params.vrf_keyhash().to_hex()
                }
            }
        }
        case CML.CertificateKind.PoolRetirement: {
            const c = cert.as_pool_retirement()!
            return {
                RetireStakePool: {
                    stake_pool: c.pool().to_hex(),
                    at_epoch: c.epoch()
                }
            }
        }
        case CML.CertificateKind.RegCert: {
            const c = cert.as_reg_cert()!
            return {
                RegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    deposit: c.deposit()
                }
            }
        }
        case CML.CertificateKind.UnregCert: {
            const c = cert.as_unreg_cert()!
            return {
                UnRegisterCredential: {
                    credential: convertCredential(c.stake_credential()),
                    refund: c.deposit()
                }
            }
        }
        case CML.CertificateKind.VoteDelegCert: {
            const c = cert.as_vote_deleg_cert()!
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
            const c = cert.as_stake_vote_deleg_cert()!
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
            const c = cert.as_stake_reg_deleg_cert()!
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
            const c = cert.as_vote_reg_deleg_cert()!
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
            const c = cert.as_stake_vote_reg_deleg_cert()!
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
            const c = cert.as_auth_committee_hot_cert()!
            return {
                AuthorizeConstitutionalCommitteeProxy: {
                    constitutional_committee_member: convertCredential(c.committee_cold_credential()),
                    proxy: convertCredential(c.committee_hot_credential())
                }
            }
        }

        case CML.CertificateKind.ResignCommitteeColdCert: {
            const c = cert.as_resign_committee_cold_cert()!
            return {
                RetireFromConstitutionalCommittee: {
                    constitutional_committee_member: convertCredential(c.committee_cold_credential())
                }
            }
        }

        case CML.CertificateKind.RegDrepCert: {
            const c = cert.as_reg_drep_cert()!
            return {
                RegisterDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential()),
                    deposit: c.deposit()
                }
            }
        }

        case CML.CertificateKind.UnregDrepCert: {
            const c = cert.as_unreg_drep_cert()!
            return {
                UnregisterDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential()),
                    refund: c.deposit()
                }
            }
        }

        case CML.CertificateKind.UpdateDrepCert: {
            const c = cert.as_update_drep_cert()!
            return {
                UpdateDelegateRepresentative: {
                    delegate_representative: convertCredential(c.drep_credential())
                }
            }
        }

    }
}

function convertCredential(credential: CML.Credential): ContractCredential {
    const type = credential.kind()
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

function convertDRep(drep: CML.DRep): DelegateRepresentative {
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

function getChallengeAddress(addr: string): Address {
    const addressInfo = getAddressDetails(addr)
    const paymentHash = addressInfo.paymentCredential!.hash
    const paymentType = addressInfo.paymentCredential?.type
    const stakeHash = addressInfo.stakeCredential?.hash
    const stakeType = addressInfo.stakeCredential?.type
    const paymentCredential: ContractCredential = paymentType == "Key" ?
        { VerificationKey: [paymentHash] } : { Script: [paymentHash] }
    const stakeCredential: StakeCredential | null = addressInfo.stakeCredential ? stakeType == "Key" ?
        { Inline: [{ VerificationKey: [stakeHash!] }] } : { Inline: [{ Script: [stakeHash!] }] } : null
    const address: Address = {
        payment_credential: paymentCredential,
        stake_credential: stakeCredential
    }
    return address
}

function getChallengeValue(value: CML.Value, canonical = true): string {
    const map = new Map<string, Map<string, bigint>>([["", new Map<string, bigint>([["", value.coin()]])]])
    if (value.has_multiassets()) {
        const multiassets = value.multi_asset()
        const policies = multiassets.keys()
        for (let i = 0; i < policies.len(); i++) {
            const policy = policies.get(i)
            const policyId = policy.to_hex()
            const assets = multiassets.get_assets(policy)
            if (assets && !assets.is_empty()) {
                const policyMap = new Map<string, bigint>()
                const assetNameList = assets.keys()
                for (let j = 0; j < assetNameList.len(); j++) {
                    const assetName = assetNameList.get(j)
                    const quantity = multiassets.get(policy, assetName)
                    if (quantity) {
                        policyMap.set(assetName.to_hex(), quantity)
                    }
                }
                if (policyMap.size > 0) {
                    map.set(policyId, policyMap)
                }
            }

        }
    }
    return Data.to(map, Value, { canonical })
}

function getChallengeDatum(datum: CML.DatumOption | undefined): string {
    if (datum) {
        if (datum.as_hash()) {
            return datum.as_hash()!.to_hex()
        } else if (datum.as_datum()) {
            return CML.hash_plutus_data(datum.as_datum()!).to_hex()
        }
    }
    return ""
}

function getChallengeScriptReference(script: CML.Script | undefined): string | null {
    if (script) {
        return script.hash().to_hex()
    }
    return null
}

// @ts-ignore
function getValue(assets: Assets): Value {
    const value = new Map<string, Map<string, bigint>>()

    for (const [k, v] of Object.entries(assets)) {
        const [policyId, assetName] = k == "lovelace" ? ["", ""] : [k.slice(0, 56), k.slice(56)]
        if (!value.has(policyId)) {
            value.set(policyId, new Map<string, bigint>())
        }
        const assetMap = value.get(policyId)!
        if (!assetMap.has(assetName)) {
            assetMap.set(assetName, v)
        } else {
            const currentValue = assetMap.get(assetName)!
            assetMap.set(assetName, currentValue + v)
        }
    }
    const serialise = Data.to(value, Value, { canonical: true })

    return Data.from(serialise, Value)
}

// @ts-ignore
function getDatum(dataHash?: string | null, data?: string | null): Datum {
    if (dataHash) {
        return { DatumHash: [dataHash] }
    } else if (data) {
        const datum = Data.from(data)
        return { InlineDatum: [datum] }
    } else {
        return { NoDatum: "NoDatum" }
    }
}

const numberToHex = (num: string | bigint): string => {
    const str = BigInt(num).toString(16)
    return str.padStart(str.length + (str.length % 2), '0')
}