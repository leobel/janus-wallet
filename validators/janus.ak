use aiken/builtin.{
  bls12_381_final_verify, bls12_381_miller_loop,
  bls12_381_mul_miller_loop_result,
}
use aiken/crypto/bls12_381/g1
use aiken/crypto/bls12_381/g2
use aiken/crypto/bls12_381/scalar.{Scalar} as scalar
use aiken/primitive/bytearray
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId} as assets
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
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

pub type Datum {
  zkey: ZkVerificationKey,
  verifiedUserId: ByteArray,
  verifiedChallenge: ByteArray,
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
    True
  }

  else(_) {
    fail
  }
}

pub type AccountParameters {
  nftRef: OutputReference,
}

validator account(params: AccountParameters) {
  spend(
    _datum: Option<Datum>,
    redeemer: Redeemer,
    _self_ref: OutputReference,
    self_tx: Transaction,
  ) {
    let Redeemer { signals, proof } = redeemer
    expect Some(accountInput) =
      self_tx.reference_inputs
        |> transaction.find_input(params.nftRef)
    let Input { output, .. } = accountInput
    expect InlineDatum(data) = output.datum
    expect Datum { verifiedUserId, verifiedChallenge, zkey } = data
    expect
      verifiedUserId == signals.userId && verifiedChallenge == signals.challenge
    expect Some(userId) = scalar.from_bytearray_big_endian(signals.userId)
    expect Some(hash) = scalar.from_bytearray_big_endian(signals.hash)
    expect Some(challenge) = scalar.from_bytearray_big_endian(signals.challenge)
    expect Some(_verifiedChallenge) =
      scalar.from_bytearray_big_endian(verifiedChallenge)
    expect Some(_verifiedUserId) =
      scalar.from_bytearray_big_endian(verifiedUserId)
    let public = [userId, hash, challenge, userId, challenge, hash]
    zk_verify(proof, public, zkey)
  }

  else(_) {
    fail
  }
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
  let userId = bytearray.from_int_big_endian(567, 32)
  let challenge = bytearray.from_int_big_endian(890, 32)
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
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
  let data =
    Datum { zkey, verifiedUserId: userId, verifiedChallenge: challenge }
  let txId = #"0000000000000000000000000000000000000000000000000000000000000000"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let params = AccountParameters { nftRef: outputReference }
  let signals = PubSignals { userId, challenge, hash }
  let pA =
    #"818c07417be4d158fdc3604892f140dff244e2161012aa91352114ab94b74be21cf4f3cf57fac49cb9aa4985fdd194cd"
  let pB =
    #"adcca26fdd822728b1f7b63e3c7018d02febd9ada51b546fb221eb0b980344d05452ad38674ca06190a5780f05dd482819cde2464912c3aa0d847cd70872297714a19851ddb787fbc041ec1ff09f8ce38b6231327f151b20f364f1304aa0e971"
  let pC =
    #"b7551e8d80c741853a16fbb135c86263adaace362e76cd5aaf5264cd920b2839a3ce728656a7743e12fa2625e8fea9cf"
  let proof = Proof { pA, pB, pC }
  let redeemer = Redeemer { signals, proof }
  let spendUtxo = OutputReference { transaction_id: "", output_index: 0 }
  let scriptHash = #"000000000000"
  let address =
    Address { payment_credential: Script(scriptHash), stake_credential: None }
  let output =
    Output {
      address,
      value: assets.zero,
      datum: InlineDatum(data),
      reference_script: None,
    }
  let input = Input { output_reference: outputReference, output }
  let tx = Transaction { ..transaction.placeholder, reference_inputs: [input] }
  account.spend(params, None, redeemer, spendUtxo, tx)
}
