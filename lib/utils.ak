use aiken/builtin.{
  bls12_381_final_verify, bls12_381_miller_loop,
  bls12_381_mul_miller_loop_result, bytearray_to_integer, mod_integer,
}
use aiken/cbor
use aiken/collection/list
use aiken/collection/pairs
use aiken/crypto.{Blake2b_224, Hash, ScriptHash, blake2b_256}
use aiken/crypto/bls12_381/g1
use aiken/crypto/bls12_381/g2
use aiken/crypto/bls12_381/scalar.{Scalar} as scalar
use aiken/option
use aiken/primitive/bytearray
use cardano/address.{
  Address, Inline, Referenced, Script, StakeCredential, VerificationKey,
  with_delegation_script,
}
use cardano/assets.{AssetName, Lovelace, PolicyId, Value} as assets
use cardano/certificate.{Certificate}
use cardano/transaction.{
  Datum, DatumHash, InlineDatum, Input, NoDatum, Output, OutputReference,
  Redeemer, ScriptPurpose, Spend, Transaction,
}
use types.{
  Challenge, ChallengeId, ChallengeOutput, Proof, SpendRedeemer,
  ZkVerificationKey,
}

pub fn evaluating_script(
  self_idx: Int,
  idx: Int,
  jdx: Int,
  self_ref: OutputReference,
  inputs: List<Input>,
  redeemers: Pairs<ScriptPurpose, Redeemer>,
) -> (Bool, Bool) {
  expect Some(script_input) = list.at(inputs, self_idx)
  expect self_ref == script_input.output_reference
  expect Script(script_hash) = script_input.output.address.payment_credential
  if evaluating_script_at(idx, script_hash, inputs, redeemers) {
    (True, idx == jdx)
  } else {
    trace @"tx is not evaluating neither this script or at index": idx
    (False, False)
  }
}

pub fn evaluating_script_at(
  index: Int,
  own_script_hash: ScriptHash,
  inputs: List<Input>,
  redeemers: Pairs<ScriptPurpose, Redeemer>,
) -> Bool {
  expect Some(input) = list.at(inputs, index)
  expect Script(script_hash) = input.output.address.payment_credential
  script_hash == own_script_hash && {
    expect Some(redeemer) =
      pairs.get_first(redeemers, Spend(input.output_reference))
    expect SpendRedeemer { idx, jdx, .. } = redeemer
    index == idx && idx == jdx
  }
}

pub fn evaluating_this_script(
  inputs: List<Input>,
  input: Input,
  idx: Int,
) -> Bool {
  expect Some(i) = list.index_of(inputs, input)
  i == idx
}

pub fn find_script_input(
  inputs: List<Input>,
  output_reference: OutputReference,
) -> Option<Input> {
  inputs
    |> transaction.find_input(output_reference)
}

pub fn build_challenge(tx: Transaction) -> Challenge {
  let Transaction {
    reference_inputs: tx_reference_inputs,
    inputs: tx_inputs,
    outputs: tx_outputs,
    mint: tx_mint,
    certificates: tx_certificates,
    // withdrawals,
    // validity_range,
    // extra_signatories,
    // datums,
    // votes,
    // proposal_procedures,
    // current_treasury_amount,
    // treasury_donation,
    ..
  } = tx
  let reference_inputs = build_challenge_inputs(tx_reference_inputs)
  let inputs = build_challenge_inputs(tx_inputs)
  let outputs = build_challenge_outputs(tx_outputs)
  let mint = build_challenge_value(tx_mint)

  // let certificates = build_challenge_certificates(tx_certificates)
  Challenge {
    reference_inputs,
    inputs,
    outputs,
    mint,
    certificates: tx_certificates,
  }
  // let bytes =
  //   ""
  //     |> bytearray.concat(cbor.serialise(reference_inputs))
  //     |> bytearray.concat(cbor.serialise(inputs))
  //     |> bytearray.concat(cbor.serialise(outputs))
  //     |> bytearray.concat(cbor.serialise(mint))
  //     |> bytearray.concat(cbor.serialise(certificates))
  //     |> bytearray.concat(cbor.serialise(withdrawals))
  //     |> bytearray.concat(cbor.serialise(validity_range))
  //     |> bytearray.concat(cbor.serialise(extra_signatories))
  //     |> bytearray.concat(cbor.serialise(datums))
  //     |> bytearray.concat(cbor.serialise(votes))
  //     |> bytearray.concat(cbor.serialise(proposal_procedures))
  //     |> bytearray.concat(cbor.serialise(current_treasury_amount))
  //     |> bytearray.concat(cbor.serialise(treasury_donation))
}

pub fn hash_challenge(challenge: Challenge) -> ChallengeId {
  let bytes = cbor.serialise(challenge)
  // trace @"serialise (challenge)": bytes
  blake2b_256(bytes)
}

pub fn to_scalar_overflow(data: ByteArray) -> (Option<Scalar>, Int) {
  let num = bytearray_to_integer(True, data)
  when scalar.new(num) is {
    None -> (scalar.new(mod_integer(num, scalar.field_prime)), 1)
    n -> (n, 0)
  }
}

pub fn build_challenge_inputs(inputs: List<Input>) -> List<OutputReference> {
  list.foldr(
    inputs,
    [],
    fn(input, ls) {
      let Input { output_reference, .. } = input
      [output_reference, ..ls]
    },
  )
}

pub fn build_challenge_outputs(outputs: List<Output>) -> List<ChallengeOutput> {
  list.foldr(
    outputs,
    [],
    fn(output, ls) {
      let Output { address, value, datum, reference_script } = output
      [
        ChallengeOutput {
          address,
          // Haskel CBOR implementation (a map is handled as canonical serialisation)
          value: build_challenge_value(value),
          datum: build_challenge_datum(datum),
          reference_script,
        },
        ..ls
      ]
    },
  )
}

pub fn build_challenge_value(value: Value) -> ByteArray {
  cbor.serialise(value)
}

pub fn build_challenge_datum(datum: Datum) -> ByteArray {
  when datum is {
    NoDatum -> #""
    DatumHash(dataHash) -> dataHash
    InlineDatum(data) -> cbor.serialise(data) |> blake2b_256
  }
}

pub fn find_circuit_input(
  inputs: List<Input>,
  policy_id: PolicyId,
  asset_name: AssetName,
) -> Option<Input> {
  list.find(
    inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        Script(script_hash) -> {
          trace @"policy_id": policy_id
          trace @"script_hash": script_hash
          (policy_id == script_hash)? && assets.quantity_of(
            input.output.value,
            policy_id,
            asset_name,
          ) == 1
        }
        _ -> False
      }
    },
  )
}

pub fn find_account_input(
  inputs: List<Input>,
  policy_id: PolicyId,
  asset_name: AssetName,
) -> Option<Input> {
  list.find(
    inputs,
    fn(input) {
      assets.quantity_of(input.output.value, policy_id, asset_name) == 1
    },
  )
}

pub fn find_account_output(
  outputs: List<Output>,
  policy_id: PolicyId,
  asset_name: AssetName,
) -> Option<Output> {
  list.find(
    outputs,
    fn(output) {
      let Output { value, .. } = output
      assets.quantity_of(value, policy_id, asset_name) == 1
    },
  )
}

pub fn zk_verify(
  proof: Proof,
  public: List<Scalar>,
  zkey: ZkVerificationKey,
) -> Bool {
  let p_a = g1.decompress(proof.p_a)
  let p_b = g2.decompress(proof.p_b)
  let p_c = g1.decompress(proof.p_c)

  let vk_acc =
    when zkey.vk_ic is {
      [] -> fail @"wrong vk_ic size"
      [ic0, ..tail] -> derive(tail, public, g1.decompress(ic0))
    }
  // pairing
  let e_ab = pairing(p_a, p_b)
  // this value is already in zkey, it's alphabeta
  let e_alpha_beta =
    pairing(g1.decompress(zkey.vk_alpha1), g2.decompress(zkey.vk_beta2))
  let e_igamma = pairing(vk_acc, g2.decompress(zkey.vk_gamma2))
  let e_cdelta = pairing(p_c, g2.decompress(zkey.vk_delta2))

  // * Miller functions
  let mlr1 = bls12_381_mul_miller_loop_result(e_alpha_beta, e_igamma)
  let mlr2 = bls12_381_mul_miller_loop_result(mlr1, e_cdelta)

  // verify
  // A1 * B2 = α1 * β2 + (w0*L0(τ)/y + w1*L1(τ)/y + … + wl*Ll(τ)/y)1 * y2 + C1 * δ2 
  bls12_381_final_verify(e_ab, mlr2)
}

// lineal combination of public list of scalars: SUM (ic)^(pi)
pub fn derive(
  vk_ic: List<ByteArray>,
  public: List<Scalar>,
  result: G1Element,
) -> G1Element {
  when vk_ic is {
    [] -> result
    [ic, ..vk_ic] ->
      when public is {
        [] -> fail
        [sc, ..public] ->
          derive(vk_ic, public, g1.add(result, g1.scale(g1.decompress(ic), sc)))
      }
  }
}

pub fn pairing(g1: G1Element, g2: G2Element) -> MillerLoopResult {
  bls12_381_miller_loop(g1, g2)
}

pub fn build_challenge_certificates(
  certificates: List<Certificate>,
) -> ByteArray {
  todo
}

pub fn include_script_input(
  inputs: List<Input>,
  script_hash: ScriptHash,
) -> Bool {
  list.any(
    inputs,
    fn(input) {
      let Input { output, .. } = input
      let Output { address, .. } = output
      let Address { payment_credential, stake_credential } = address
      expect Script(payment_hash) = payment_credential
      expect Some(Inline(Script(stake_hash))) = stake_credential
      payment_hash == script_hash && stake_hash == script_hash
    },
  )
}

pub const stakeRegistrationDeposit: Lovelace = 2_000_000
