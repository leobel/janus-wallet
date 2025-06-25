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
      38358706005010237984897052131059375087277120723539046063548902418320083744329,
      32,
    )
  let nonce = #"1234567890"
  let zkey = get_zkey()
  let script_hash = #"45e7ce17366d83c4c25d37ec2f9039cb614a305fdb4bead40f424876"
  let accountData = AccountDatum { user_id, hash, nonce, script_hash }
  let address = get_script_address(script_hash)
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
      credential: Script(script_hash),
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
    #"9054e3e899146c70a33e935e00cbed99060c06afcfd53b7c6fc864f7b07b3386e2e27dc798d38f2132dc651c5351b5aa"
  let p_b =
    #"8d50967cb959e3b2f66df90703a9e5c41e7a4ab0fc60beea301715357a924696400b76262574e3e3be24e95e75ef84f41804b086cde3319248841c64671cd0bb106aab87e0ea4c2922e1f80377cd10dd6fcfcef1942cf822747d064f35368f5b"
  let p_c =
    #"b1adbf6f6c6378a60e9a9c883a15a4b31113a8cb9d13afcb5db45ea0426fe7ce1d5484d0234a3cb71119e061700e047f"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let hash =
    option.or_else(
      scalar.new(
        38358706005010237984897052131059375087277120723539046063548902418320083744329,
      ),
      scalar.one,
    )
  let circuit_hash =
    option.or_else(
      scalar.new(
        51144372254986188763633616671201291769628063042926002312308424635337077359052,
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
  let public = [user_id, hash, challenge, overflow, circuit_hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_1() {
  let zkey = get_zkey()
  let p_a =
    #"8d444fab1c847112b20421d67d49f9814bb339e2c72633af280780dc7d0402ca255748d036877744123460e2b680082a"
  let p_b =
    #"a5f4871c5654f1094796479c92659f6c97c8e00613abe8163f1c143e473accc8d8ca748a4e5ba5ef53ed1e4fd6222f52100a0c0103dd2d5c76123563c4a80ada8ad4070c9668a0d0df2442cd837949848bf388f545bf31994505671c962a49eb"
  let p_c =
    #"b663de6c83239388505c25c47bb9e882de389a203ed65084a7e070c7370216d43773c4f4f8fa1ce1ce8544bb368004b6"
  let proof = Proof { p_a, p_b, p_c }
  let user_id = option.or_else(scalar.new(332621201508635767747121), scalar.one)
  let hash =
    option.or_else(
      scalar.new(
        26153876879400612280134036031852041740678837593561870331470402059052248864877,
      ),
      scalar.one,
    )
  let circuit_hash =
    option.or_else(
      scalar.new(
        136276869938915024026222020207617093338490483274455411416665336862387955399,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        48498656708846887221535287026578788581134725406450318940724854086903809194189,
      ),
      scalar.one,
    )
  let overflow = scalar.zero
  let public = [user_id, hash, challenge, overflow, circuit_hash]
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
    #"b0e97521583b43e0478ba9263de61204642ed973b19bf58e59a41c7658e07e3a5a49f2f4e034f0e535c9234abbec7e5e"
  let p_b =
    #"a621487196d72d6dd807d4ac72729e0d19d325e307dc14cc735d155bdd5789af4172040983651ed8491a7154abb7d2050f842074d66e6cb6549b348807d1763c3b1155a04e8922544e46bd965d8a602d29da1fc94a7195327749040c30a4b06a"
  let p_c =
    #"b36e24d127f3afe3be00366fac210a7c5186681a7bf92eb73f57e51344507c36b550201961b086d754308ca05dbedc9d"
  let proof = Proof { p_a, p_b, p_c }
  let user_id =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let hash =
    option.or_else(
      scalar.new(
        42667559499481964806883096447066665765643633659436475653849294459786628627543,
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
  let circuitHash =
    option.or_else(
      scalar.new(
        13209585094728165827871505059244715235710397339182070690976257514533459913410,
      ),
      scalar.one,
    )
  let public = [user_id, hash, challenge, challengeFlag, circuitHash]
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
    vk_delta2: #"910d1b3de24b56acded36e43285b5abf910def69fa6f945b0a423dde08579d67f902cb2953a4e7b5f6bc2b9d173ec48c16fdffab8bad9fb1700e35bc74ea24c6d72f1d717cae480612e71990734ace847aed7f6ff9de9d6efc85698b3095669c",
    vk_ic: [
      #"8d043ff56d286437f7783c5c9f7d9db2fc4678172f99454965f5085e17a9bd1f1613d14fffd8bcc826420946c35c925b",
      #"86fa74a9049758feb0336041daf0feb5f1d892ed563baac600ccf37e2ae7319b68070293a39b992e547bd264ca55bb48",
      #"90c9f2c17f3ca057bb78858da0a800bf5dd7ce60c38efa8db74a1abbc3eac9325448dff74e05ead6f04897982076a798",
      #"8ecfbfd2e8f23c4116d078da1806abcab8c4abe3af53c850e7b77a4a5fe27cae9db82e3de02bcd665c26946b0a38d035",
      #"a6df181d334c56b40aa234d5d460ddac333c18bb10574346ed11416e42b7af1d29ac77deaa02e0baf203624e384a27bd",
      #"83e9fd82457045e4ec2ee99837707c234ecbf106344148819b4c19ef1559a639b1a78faa39e2af44f73352f555855177",
    ],
  }
}
