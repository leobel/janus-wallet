use aiken/builtin.{
  bls12_381_final_verify, bls12_381_miller_loop,
  bls12_381_mul_miller_loop_result, bytearray_to_integer, mod_integer,
}
use aiken/cbor
use aiken/collection/list
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
use cardano/assets.{AssetName, PolicyId, Value} as assets
use cardano/certificate.{Certificate}
use cardano/transaction.{
  Datum, DatumHash, InlineDatum, Input, NoDatum, Output, OutputReference,
  Transaction,
}

pub type ZkVerificationKey {
  // G1Element
  vk_alpha1: ByteArray,
  // G2Element
  vk_beta2: ByteArray,
  // G2Element
  vk_gamma2: ByteArray,
  // G2Element
  vk_delta2: ByteArray,
  // List<G1Element>
  vk_ic: List<ByteArray>,
}

pub type ZkDatum {
  userId: ByteArray,
  hash: ByteArray,
  zkey: ZkVerificationKey,
}

pub type PubSignals {
  userId: ByteArray,
  challenge: ByteArray,
  hash: ByteArray,
}

pub type Proof {
  pA: ByteArray,
  pB: ByteArray,
  pC: ByteArray,
}

pub type Redeemer {
  signals: PubSignals,
  proof: Proof,
}

pub type Parameters {
  // policy: ByteArray,
  nounce: ByteArray,
}

validator wallet(_params: Parameters) {
  mint(_r: Data, _policy_id: PolicyId, _tx: Transaction) {
    // Validate token data (inline for now) contains holder utxo_ref (txId#index) and all other necessary data needed for spending script
    True
  }

  else(_) {
    fail
  }
}

pub type AccountParameters {
  policy_id: PolicyId,
  asset_name: AssetName,
  for_evaluation: Bool,
}

pub type Challenge {
  reference_inputs: List<OutputReference>,
  inputs: List<OutputReference>,
  outputs: List<ChallengeOutput>,
  mint: ByteArray,
  certificates: List<Certificate>,
}

pub type ChallengeId =
  Hash<Blake2b_224, Transaction>

pub type ChallengeOutput {
  address: Address,
  value: ByteArray,
  datum: ByteArray,
  reference_script: Option<ScriptHash>,
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

pub fn build_challenge_certificates(
  certificates: List<Certificate>,
) -> ByteArray {
  todo
}

validator account(params: AccountParameters) {
  spend(
    _datum: Option<Data>,
    redeemer: Redeemer,
    _self_ref: OutputReference,
    self_tx: Transaction,
  ) {
    let Redeemer { signals, proof } = redeemer
    let Transaction { reference_inputs, .. } = self_tx
    let challengeId = build_challenge(self_tx) |> hash_challenge
    trace @"challengeId": challengeId
    trace @"signals challengeId": signals.challenge
    trace @"is for evaluetion?": if params.for_evaluation {
      @"true"
    } else {
      @"false"
    }
    // Script for test is used to calculate ExUnits **ONLY** 
    // so we don't need to ask user to generated a proof/signals just for passing evaluation
    // instead we compare agains same value provided to guarantee same script ex steps
    if params.for_evaluation {
      // NOTE: this will **ALWAYS** pass
      expect signals.challenge == signals.challenge
    } else {
      expect signals.challenge == challengeId
    }
    expect Some(accountInput) =
      reference_inputs
        |> find_account_input(params.policy_id, params.asset_name)
    let Input { output, .. } = accountInput
    expect InlineDatum(data) = output.datum
    trace @"ZkDatum": data
    expect ZkDatum { userId: verifiedUserId, hash: verifiedHash, zkey } = data
    trace @"verified userId": verifiedUserId
    trace @"userId": signals.userId
    expect verifiedUserId == signals.userId
    trace @"verified hash": verifiedHash
    trace @"hash": signals.hash
    expect verifiedHash == signals.hash
    expect Some(userId) = scalar.from_bytearray_big_endian(signals.userId)
    expect Some(hash) = scalar.from_bytearray_big_endian(signals.hash)
    let numChallenge = bytearray_to_integer(True, signals.challenge)
    expect (Some(challenge), overflow) =
      when scalar.new(numChallenge) is {
        None -> (scalar.new(mod_integer(numChallenge, scalar.field_prime)), 1)
        n -> (n, 0)
      }
    // TODO: add challenge overflow to circuit
    trace @"userId (number)": userId
    trace @"pwdHash (number)": hash
    trace @"challenge (number)": challenge
    trace @"overflow": overflow
    let public = [userId, hash, challenge, userId, challenge, hash]
    zk_verify(proof, public, zkey)?
  }

  else(_) {
    fail
  }
}

pub fn find_account_input(
  inputs: List<Input>,
  policyId: PolicyId,
  assetName: AssetName,
) -> Option<Input> {
  list.find(
    inputs,
    fn(input) {
      let Input { output, .. } = input
      let Output { value, .. } = output
      assets.quantity_of(value, policyId, assetName) == 1
    },
  )
}

pub fn zk_verify(
  proof: Proof,
  public: List<Scalar>,
  zkey: ZkVerificationKey,
) -> Bool {
  let pA = g1.decompress(proof.pA)
  let pB = g2.decompress(proof.pB)
  let pC = g1.decompress(proof.pC)

  let vk_acc =
    when zkey.vk_ic is {
      [] -> fail @"wrong vk_ic size"
      [ic0, ..tail] -> derive(tail, public, g1.decompress(ic0))
    }
  // pairing
  let eAB = pairing(pA, pB)
  let eAlphaBeta =
    pairing(g1.decompress(zkey.vk_alpha1), g2.decompress(zkey.vk_beta2))
  let eIGamma = pairing(vk_acc, g2.decompress(zkey.vk_gamma2))
  let eCDelta = pairing(pC, g2.decompress(zkey.vk_delta2))

  // * Miller functions
  let mlr1 = bls12_381_mul_miller_loop_result(eAlphaBeta, eIGamma)
  let mlr2 = bls12_381_mul_miller_loop_result(mlr1, eCDelta)

  // verify
  bls12_381_final_verify(eAB, mlr2)
}

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

test mint_ok() {
  let params =
    Parameters {
      // policy: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let data = #"000000000000000000000000"
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  wallet.mint(params, data, policyId, transaction.placeholder)
}

test verify_ok() {
  trace @"userId": scalar.from_bytearray_big_endian(#"466f6e74757323303030")
  trace @"hash": scalar.from_bytearray_big_endian(
    #"16de4e0412334a7a78664ef6307117e601c9db5213b7ea96a1edf1d1fab543de",
  )
  let userId = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      // vk_beta2: #"a45f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let data = ZkDatum { userId, hash, zkey }
  let spendUtxo = OutputReference { transaction_id: "", output_index: 0 }
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }

  let address = with_delegation_script(addr, scriptHash)
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: InlineDatum(data),
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: OutputReference {
            transaction_id: #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac",
            output_index: 0,
          },
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: Address {
            payment_credential: VerificationKey(
              #"3dce7844f36b23b8c3f90afba40aa188e7f1d3f6e8acd1d544ed1da9",
            ),
            stake_credential: None,
          },
          value: assets.from_lovelace(10000000),
          datum: InlineDatum(data),
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      mint: mint,
    }
  let challenge = build_challenge(tx) |> hash_challenge
  let signals = PubSignals { userId, challenge, hash }
  // let pA =
  //   #"b2ca44138d818eb078a146407b2fedee4e8856900e23ddbeb9a9faf676bc74e46bfa1e4cdf7e8a3bfab3d739515a9c30"
  // let pB =
  //   #"a69467ebfb61184e431423caa74cdb1650ac47521364de6375fa3ec843915faaefd2847bede0d6319a3b7bb274bfc738159711da78cb72bacc60b23db9292d787421d97f7bd78a3df29f912c36431cea29c3091b457fb1d74954cde324807ef0"
  // let pC =
  //   #"b03d49a68e2cc13e85e6dbb99b947f77ddf8242e267c9e87389c072a6c18dc414bfb51d1da5940f5c04d2a3651c96d4a"
  let pA =
    #"b5954b04ea1d2956fac946a3dabbe826cc4651322c23423a245d65f528bd5adead5aee7cbcfc3d86ae96a9ecfc40d3e8"
  let pB =
    #"a3f50879ce5f27741ef8b0dfaf4b100f1fbc9ed503c2edd901dfbd080c449e40c97c8e465d191514565ede494209181e00f121f68062b2e6048d566ccfab5bd01271ade34d9e07362c41635ea371aef4487302db945e8aa8664ed73214a68216"
  let pC =
    #"aa0b4443bb50d1c93ce088b2df5abb315fceb183c709008e071c196ae4e6d1a969ed62b747f4bf84e9d22eea9278dd9a"
  let proof = Proof { pA, pB, pC }
  // trace @"serialise (challenge)": build_challenge(tx) |> cbor.serialise
  let redeemer = Redeemer { signals, proof }
  let params =
    AccountParameters {
      policy_id: policyId,
      asset_name: assetName,
      for_evaluation: True,
    }

  // let public =
  //   [
  //     option.or_else(scalar.new(332621201508635767746608), scalar.one),
  //     option.or_else(
  //       scalar.new(
  //         10343661163184219313272354919635983875711247223011266158462328948931637363678,
  //       ),
  //       scalar.one,
  //     ),
  //     option.or_else(
  //       scalar.new(
  //         51891613829265625378560554888192412376874405841139917857278942238725157370276,
  //       ),
  //       scalar.one,
  //     ),
  //     option.or_else(scalar.new(332621201508635767746608), scalar.one),
  //     option.or_else(
  //       scalar.new(
  //         51891613829265625378560554888192412376874405841139917857278942238725157370276,
  //       ),
  //       scalar.one,
  //     ),
  //     option.or_else(
  //       scalar.new(
  //         10343661163184219313272354919635983875711247223011266158462328948931637363678,
  //       ),
  //       scalar.one,
  //     ),
  //   ]
  // trace @"is valid?": if zk_verify(proof, public, zkey) {
  //   @"true"
  // } else {
  //   @"false"
  // }
  account.spend(params, None, redeemer, spendUtxo, tx)
}

validator foo {
  spend(
    _datum: Option<Data>,
    _redeemer: Data,
    _self_ref: OutputReference,
    self_tx: Transaction,
  ) {
    let Transaction { id, .. } = self_tx
    trace @"tx hash": id
    fail
  }

  else(_) {
    fail
  }
}
