use aiken/builtin.{bytearray_to_integer, integer_to_bytearray}
use aiken/crypto/bls12_381/scalar
use aiken/option
use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey, with_delegation_script}
use cardano/assets
use cardano/certificate.{DelegateBlockProduction, RegisterAndDelegateCredential}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction,
}
use types.{AccountDatum, Proof, ZkVerificationKey}
use utils.{build_challenge, hash_challenge, to_scalar_overflow, zk_verify}

test verify_challenge_certs() {
  let user_id = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let zkey = get_zkey()
  let accountData = AccountDatum { user_id, hash, nonce }
  let scriptHash = #"45e7ce17366d83c4c25d37ec2f9039cb614a305fdb4bead40f424876"
  let address = get_script_address(scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let circuit_asset_name = #"466f6e74757323303031"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 4_366_030)]), Pair(policy_id, [Pair(assetName, 1)])],
      ),
      datum: InlineDatum(accountData),
      reference_script: None,
    }
  let txId = #"d6da036c1aeb7680323258c763a2a6e25be9b280c2a8fedd5e43cb89730fdadf"
  let outputReference =
    OutputReference { transaction_id: txId, output_index: 0 }
  let input = Input { output_reference: outputReference, output }
  let circuit_input =
    Input {
      output_reference: OutputReference {
        transaction_id: txId,
        output_index: 1,
      },
      output: Output {
        address: get_script_address(policy_id),
        value: assets.from_asset_list(
          [
            Pair("", [Pair("", 1000000)]),
            Pair(policy_id, [Pair(circuit_asset_name, 1)]),
          ],
        ),
        datum: InlineDatum(zkey),
        reference_script: None,
      },
    }
  let cert =
    RegisterAndDelegateCredential {
      credential: Script(scriptHash),
      delegate: DelegateBlockProduction {
        stake_pool: #"094dc39da2d8434f9ddb93749a1930288e5dd89ae04fa5914e157bd6",
      },
      deposit: 2_000_000,
    }
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input, circuit_input],
      inputs: [
        Input {
          output_reference: OutputReference {
            transaction_id: #"76004ab7e110948007c14da402e873986f7c844755f1f62eabe25155d9610757",
            output_index: 0,
          },
          output: Output {
            address,
            value: assets.from_lovelace(10_000_000),
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
          value: assets.from_lovelace(6_662_059),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      certificates: [cert],
    }
  let challenge =
    #"45fb67424f5a33f535de54e8eb8ee338c38f658fd64a5bc680c24800ff1e9170"
  let build_challenge = build_challenge(tx) |> hash_challenge
  challenge == build_challenge
}

test verify_zk_proof() {
  let zkey = get_zkey()
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544200,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930331,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_invalid_user() fail {
  let zkey = get_zkey()
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(12345567890), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544200,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930331,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_invalid_circuit_hash() fail {
  let zkey = get_zkey()
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544201,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930331,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_invalid_challenge() fail {
  let zkey = get_zkey()
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544200,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930333,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_invalid_overflow() fail {
  let zkey = get_zkey()
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544200,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930331,
      ),
      scalar.one,
    )
  let overflow = scalar.one
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_invalid_proof() fail {
  let zkey = get_zkey()
  let p_a =
    #"887ffde615b9fc5b7974ca73328663b938fdf295107a4999535f6085aec0f7a2c7b25efa996d7e73c26e3a24e9994b96"
  let p_b =
    #"a3329e6511058a7deab9c937cc3936b316d9e9da403b5e70f1a976d06c0cc0a76adf8e677a158e1fec4dce33eb0b9c230ed84aaf088be80c607dc91ba55682d918d205ebb9e425821c0450e5b62937938f53f84b276f61ae976786ed113e6c7c"
  let p_c =
    #"83c484deabff3c5024c140f44f018baf96abd29207d9077e3a5ceb209b918ba292dfb390992fd4e206678dbfc2121fd3"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let circuit_hash =
    option.or_else(
      scalar.new(
        1213068129888263879523280420374147302574367144364172966430678699081284544200,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        15508608271287428592369580175065299368102118271501153969697864720906988930331,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_overflow_one() {
  // scalar.field_prime = 52435875175126190479447740508185965837690552500527637822603658699938581184513
  let max = #"e7db4ea6533afa906673b0101343b00aa77b4805fffcb7fdfffffffe00000001"
  expect (Some(challenge), overflow) = to_scalar_overflow(max)
  scalar.to_int(challenge) + 1 == scalar.field_prime && overflow == scalar.one
}

test verify_zk_proof_overflow_zero() {
  // max = scalar.field_prime (52435875175126190479447740508185965837690552500527637822603658699938581184513) - 1
  let max = integer_to_bytearray(True, 32, scalar.field_prime - 1)
  expect (Some(challenge), overflow) = to_scalar_overflow(max)
  scalar.to_int(challenge) + 1 == scalar.field_prime && overflow == scalar.zero
}

test verify_zk_proof_performance() {
  let zkey = get_zkey()
  let p_a =
    #"887ffde615b9fc5b7974ca73328663b938fdf295107a4999535f6085aec0f7a2c7b25efa996d7e73c26e3a24e9994b96"
  let p_b =
    #"a3329e6511058a7deab9c937cc3936b316d9e9da403b5e70f1a976d06c0cc0a76adf8e677a158e1fec4dce33eb0b9c230ed84aaf088be80c607dc91ba55682d918d205ebb9e425821c0450e5b62937938f53f84b276f61ae976786ed113e6c7c"
  let p_c =
    #"83c484deabff3c5024c140f44f018baf96abd29207d9077e3a5ceb209b918ba292dfb390992fd4e206678dbfc2121fd3"
  let proof = Proof { p_a, p_b, p_c }
  let user_id =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let challengeFlag = scalar.one
  let hash =
    option.or_else(
      scalar.new(
        7872546840633957424423922093117117055086684658853702699218477667386254515905,
      ),
      scalar.one,
    )
  let public = [user_id, challenge, challengeFlag, hash]
  zk_verify(proof, public, zkey)
}

fn get_script_address(script_hash: ByteArray) -> Address {
  with_delegation_script(
    Address { payment_credential: Script(script_hash), stake_credential: None },
    script_hash,
  )
}

fn get_zkey() -> ZkVerificationKey {
  ZkVerificationKey {
    vk_alpha1: #"8f944ea2be1d423e0c36e660f1ada1a7134635fa3465a5fcaef0acf1f0896999a75cadedf66d311cd0a6313c18ffafce",
    vk_beta2: #"81dfe06986c3f80e8297c1ebb297671e768da02d5bf34ad87b404aba89cc1655f024e28942c7a1169139e6ce5ecacfde081e9ba17708034ca12593f19c020c2544e49aaff91a718f0199d1c35ae00b0f5f8101028d4ab9e804bf35a7f3eea524",
    vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
    vk_delta2: #"84bf191b52b37245585ff46a89b0b7489050c06f305c76ff3f091400f055782e07c549300ab623ac239f253276aa3a860d6f734f51e36c68aaceaf9278cd8f69d7737ec862effa5442ad75fb328e471811b43bae6ac6ca27f52fdc358df81a56",
    vk_ic: [
      #"b96ea33f7e293ee46e2a5298bfc29547175296e94001cd3a6b4da298bf1103ea2ff66053a9d1e7eb7183709dbadefd8e",
      #"90daa46fc04d5e71ff4c4abd1f71e042cb60f3a0a4884d1c13aec3401cf6e4723f3e4b11b7e5a8548777447a4f66d55d",
      #"b38187f1fc1fe0f5769846a05a96b99c06de97a99aa25c00066b9c4fbe948ff93866b11b0424ab497277da64aed53ad9",
      #"b7caa8872d7c82bad8e14797f6aaae278911fc2b5ecd69e71fa8762ad9d525197630b43ab5ba06eb1739548e0e83800b",
      #"85c7f52cf0ca708c389d07a01c30565679588362431b2787ab6c22b47b58e4f31a318fc2cdb9844b84c9de7a1fd09fc8",
    ],
  }
}
