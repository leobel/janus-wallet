use aiken/builtin.{bytearray_to_integer, mod_integer}
use aiken/crypto/bls12_381/scalar
use aiken/primitive/bytearray
use cardano/address.{
  Address, Credential, Script, VerificationKey, with_delegation_script,
}
use cardano/assets.{PolicyId} as assets
use cardano/certificate.{
  Certificate, DelegateBlockProduction, DelegateCredential,
  RegisterAndDelegateCredential, RegisterCredential,
}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction,
}
use types.{
  AccountParameters, Delegate, Parameters, Proof, PubSignals, PublishRedeemer,
  Redeemer, Register, RegisterAndDelegate, Withdraw, WithdrawRedeemer, ZkDatum,
  ZkVerificationKey,
}
use utils.{
  build_challenge, find_account_input, hash_challenge, include_script_input,
  stakeRegistrationDeposit, zk_verify,
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
      expect
        signals.challenge == challengeId || signals.challenge == signals.challenge
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

  publish(
    redeemer: PublishRedeemer,
    certificate: Certificate,
    self_tx: Transaction,
  ) {
    when redeemer is {
      Register -> {
        expect RegisterCredential {
          credential: Script(script_hash),
          deposit: Never,
        } = certificate
        trace @"script hash": script_hash
        include_script_input(self_tx.inputs, script_hash)
      }
      RegisterAndDelegate -> {
        expect RegisterAndDelegateCredential {
          credential: Script(script_hash),
          delegate: DelegateBlockProduction { .. },
          deposit,
        } = certificate
        trace @"script hash": script_hash
        (deposit == stakeRegistrationDeposit)? && include_script_input(
          self_tx.inputs,
          script_hash,
        )
      }
      Delegate -> {
        expect DelegateCredential {
          credential: Script(script_hash),
          delegate: DelegateBlockProduction { .. },
        } = certificate
        trace @"script hash": script_hash
        include_script_input(self_tx.inputs, script_hash)
      }
    }
  }

  withdraw(
    redeemer: WithdrawRedeemer,
    account: Credential,
    self_tx: Transaction,
  ) {
    when redeemer is {
      Withdraw -> True
    }
  }

  else(_) {
    fail
  }
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
