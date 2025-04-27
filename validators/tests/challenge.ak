use aiken/cbor
use aiken/primitive/bytearray
use cardano/address.{
  Address, Script, VerificationKey, with_delegation_key, with_delegation_script,
}
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Redeemer, Spend,
  Transaction,
}
use types.{AccountDatum, Proof, PubSignals, SpendRedeemer, ZkVerificationKey}
use utils.{build_challenge, hash_challenge}

test build_challenge_ok() {
  let user_id = #"466f6e74757323303034"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      // 1234 (16de4e0412334a7a78664ef6307117e601c9db5213b7ea96a1edf1d1fab543de)
      32,
    )
  let zkey = get_zkey()
  let nonce =
    #"37333665633465662d393332382d343966362d396230332d303464313237653161613662"
  let account_datum = AccountDatum { user_id, hash, nonce }
  let policy_id = #"3c692631872308ff1f9fed102b940aecee160def9c2478b50b977091"
  let asset_name = #"466f6e74757323303034"
  let circuit_asset_name = #"4369726375697423303030"
  let address =
    get_script_address(
      #"2001b7fbb6f955482edc974b2afd47ca11d259707e0e5207498eb595",
      Some(#"2001b7fbb6f955482edc974b2afd47ca11d259707e0e5207498eb595"),
    )
  let circuit_input =
    Input {
      output_reference: OutputReference {
        transaction_id: #"1f579023f813aa8936e98ec0b687c80622853d1f12796a5d436f8f40fbf5571e",
        output_index: 0,
      },
      output: Output {
        address,
        value: assets.from_asset_list(
          [
            Pair("", [Pair("", 4279830)]),
            Pair(policy_id, [Pair(circuit_asset_name, 1)]),
          ],
        ),
        datum: InlineDatum(zkey),
        reference_script: None,
      },
    }
  let user_input =
    Input {
      output_reference: OutputReference {
        transaction_id: #"091240a11c67b121a8e5613e3ec58a67e3c107c0f5c900bbfc416a79203afe69",
        output_index: 0,
      },
      output: Output {
        address,
        value: assets.from_asset_list(
          [
            Pair("", [Pair("", 1577460)]),
            Pair(policy_id, [Pair(asset_name, 1)]),
          ],
        ),
        datum: InlineDatum(account_datum),
        reference_script: None,
      },
    }

  //   let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let challenge_id =
    #"d080cfea9ce9d881b6b96679436d450c3ca00b783b3862200d841bdd2531f5d4"
  let signals =
    PubSignals { user_id: asset_name, challenge: challenge_id, hash }
  let proof =
    Proof {
      p_a: #"aa9d6186db6d022d7eddbc3cf010dd41856ea9ed2bf2e92bec311206ded640ce8ab904dae5d1d973f98d6faf003c7849",
      p_b: #"95e5e8d1f95adb391bb10144faa14495435945081e847fb4aa9f9af423eadefdf43ee6b1b8faa361b365b2dba52fca6e0b8d8b04f009291e091a04796eb7f2e33f4430eaa905fa541808582c725e9df4e3c2bf2f95e4db55101e770f4a6eca3f",
      p_c: #"82a9d76ff0d5338582b4dd71ef0327f584749afc7d639555ed37475fd0a303932acb80703f42eb57543e337850b27df9",
    }
  let scriptRedeemer: Redeemer =
    SpendRedeemer {
      self_idx: 0,
      idx: 0,
      jdx: 0,
      signals: Some(signals),
      proof: Some(proof),
    }
  let scriptOutputReference =
    OutputReference {
      transaction_id: #"5eb7695dd521c1b032c48c38cfd9c6e6f418c5dbdb3588999c5bc0fda8bf101c",
      output_index: 0,
    }
  let redeemers = [Pair(Spend(scriptOutputReference), scriptRedeemer)]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [circuit_input, user_input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(10000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: get_verification_key_address(
            #"e52ded0f93f2cb669317a6ae9b1316a7182e5ef40fd0c6d934cf62f2",
            Some(#"7e6d90260a406824d6d4b5ae7a2f48bed1e47881c7e4468d06ffbfa0"),
          ),
          value: assets.from_lovelace(2000000),
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.from_lovelace(6824174),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
    }
  let challenge = build_challenge(tx)
  //   trace @"serialise (challenge)": challenge |> cbor.serialise
  let built_challenge_id = challenge |> hash_challenge
  challenge_id == built_challenge_id
}

fn get_script_address(
  script_hash: ByteArray,
  stake_hash: Option<ByteArray>,
) -> Address {
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  when stake_hash is {
    Some(stake) -> with_delegation_script(addr, stake)
    None -> addr
  }
}

fn get_verification_key_address(
  payment_hash: ByteArray,
  stake_hash: Option<ByteArray>,
) -> Address {
  let addr =
    Address {
      payment_credential: VerificationKey(payment_hash),
      stake_credential: None,
    }
  when stake_hash is {
    Some(stake) -> with_delegation_key(addr, stake)
    None -> addr
  }
}

fn get_zkey() -> ZkVerificationKey {
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
}
