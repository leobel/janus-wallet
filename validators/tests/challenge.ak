use aiken/cbor
use aiken/primitive/bytearray
use cardano/address.{
  Address, Script, VerificationKey, with_delegation_key, with_delegation_script,
}
use cardano/assets
use cardano/certificate.{
  Certificate, DelegateBlockProduction, DelegateCredential,
  DelegateRepresentative, DelegateVote, RegisterAndDelegateCredential,
  RegisterCredential,
}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Publish, Redeemer, Spend,
  Transaction,
}
use types.{
  AccountDatum, Proof, PubSignals, RegisterAndDelegate, SpendRedeemer,
  ZkVerificationKey,
}
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

test build_challenge_ok_1() {
  let user_id = #"466f6e74757323303231"
  let hash =
    #"243262243130246c7937437063726c42786e777977416b5a34494e444f4e6c782f634e4c327065627964523735452e376639522e6b32476c7931734f"
  let zkey = get_zkey()
  let nonce =
    #"63306531613062352d663339642d343432652d383462622d373463306335396265623439"
  let account_datum = AccountDatum { user_id, hash, nonce }
  let policy_id = #"cadc50649cd1daf6e0dea610dd9392a8be1c8e6ac570dc3773101f97"
  let circuit_asset_name = #"4369726375697423303032"
  let address =
    get_script_address(
      #"3daf6abb8d762de665c903ca085d9b32a05cc1dd20745e0b07577577",
      Some(#"3daf6abb8d762de665c903ca085d9b32a05cc1dd20745e0b07577577"),
    )
  let circuit_input =
    Input {
      output_reference: OutputReference {
        transaction_id: #"c7ac7e242699ee9ed6b9d7f7cfea9fd4c1ae4c457ec8bdd63a60186b8e188369",
        output_index: 0,
      },
      output: Output {
        address,
        value: assets.from_asset_list(
          [
            Pair("", [Pair("", 4064330)]),
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
        transaction_id: #"1748e9f8009c37e4d9c586e01c93582de42eec6ffdf17a77ab79f08e73438910",
        output_index: 0,
      },
      output: Output {
        address,
        value: assets.from_asset_list(
          [Pair("", [Pair("", 1698140)]), Pair(policy_id, [Pair(user_id, 1)])],
        ),
        datum: InlineDatum(account_datum),
        reference_script: None,
      },
    }

  //   let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let challenge_id =
    #"6b394455a5341da0689945be06eb19f0e373eb8b5ec1e3ed0738dc17b52c38cd"
  let signals =
    PubSignals {
      user_id,
      challenge: challenge_id,
      hash: #"4d21460aaf60650fee7473867a1be9a08c8671066755d6312d923a8efb66c7",
    }
  let proof =
    Proof {
      p_a: #"b826ad08638b2868286371b2caec97651a3b0e42a7244a7c33d4b6390c9d789251cc5cb93c190650f025cd1cf10cc2dd",
      p_b: #"b31893c229a3f16633d98fa3b4bb3d4b528c50fcfe95654c8ac99da8da73592eacbd7108a41840dad0e31aec6132dee40e8c2df2a8485451f8a78e4b9f7fb31c7c3c179a2f04b8b5f4a4559aed91f815ac87304570e300fe0c40abcd31b5e358",
      p_c: #"9531356b035ed46cc426f723cbd6faa57af8b14ff758e802fc1286b8aee1f51bc08a7355b0f94973fd793ad2fd0a8afd",
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
      transaction_id: #"d791f39a0d9f231d294519fddd92f784e767d7a2610bd0a1226609e16203dce2",
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
          value: assets.from_lovelace(7403431),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
    }
  let challenge = build_challenge(tx)
  //   trace @"serialise (challenge)": challenge |> cbor.serialise
  let built_challenge_id = challenge |> hash_challenge
  trace @"challenge_id:": challenge_id
  trace @"built_challenge_id:": built_challenge_id
  challenge_id == built_challenge_id
}

test build_challenge_register_and_delegate() {
  let user_id = #"446566692d46726f6e74696572233032"
  let hash =
    #"243262243130246c7937437063726c42786e777977416b5a34494e444f594b3664755a426d48414735684c4752336d7279527869507a446a4b646161"
  let zkey = get_zkey()
  let nonce =
    #"62396164306461352d383830652d343031322d626534302d643933313466633064303138"
  let account_datum = AccountDatum { user_id, hash, nonce }
  let policy_id = #"cadc50649cd1daf6e0dea610dd9392a8be1c8e6ac570dc3773101f97"
  let circuit_asset_name = #"4369726375697423303032"
  let address =
    get_script_address(
      #"63e4e268784458a25a06923eea5f380cb43e71db700eb02538c1e065",
      Some(#"63e4e268784458a25a06923eea5f380cb43e71db700eb02538c1e065"),
    )
  let circuit_address = get_script_address(policy_id, Some(policy_id))
  let circuit_input =
    Input {
      output_reference: OutputReference {
        transaction_id: #"c7ac7e242699ee9ed6b9d7f7cfea9fd4c1ae4c457ec8bdd63a60186b8e188369",
        output_index: 0,
      },
      output: Output {
        address: circuit_address,
        value: assets.from_asset_list(
          [
            Pair("", [Pair("", 4064330)]),
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
        transaction_id: #"7c012ffd5ee328b356e07ad4c40208deb9958a46871574b448b4afc5b6b00b3b",
        output_index: 0,
      },
      output: Output {
        address,
        value: assets.from_asset_list(
          [Pair("", [Pair("", 1749860)]), Pair(policy_id, [Pair(user_id, 1)])],
        ),
        datum: InlineDatum(account_datum),
        reference_script: None,
      },
    }

  //   let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let challenge_id =
    #"c2874eed87a39e354dfd8e952174bb344e13c0ae9c73cc7f4d8f4957d0698863"

  let scriptOutputReference =
    OutputReference {
      transaction_id: #"5ee2b7875764f9a7fa7a353d0372067a489ee2be0b4221b6832b0f33406a0dec",
      output_index: 0,
    }
  let certificate =
    RegisterAndDelegateCredential {
      credential: Script(
        #"63e4e268784458a25a06923eea5f380cb43e71db700eb02538c1e065",
      ),
      delegate: DelegateBlockProduction {
        stake_pool: #"efae72c07a26e4542ba55ef59d35ad45ffaaac312865e3a758ede997",
      },
      deposit: 2000000,
    }

  let tx =
    Transaction {
      ..transaction.placeholder,
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(100_000_000),
            datum: NoDatum,
            reference_script: None,
          },
        },
      ],
      reference_inputs: [user_input, circuit_input],
      outputs: [
        Output {
          address,
          value: assets.from_lovelace(96639429),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      certificates: [certificate],
    }
  let challenge = build_challenge(tx)
  //   trace @"serialise (challenge)": challenge |> cbor.serialise
  let built_challenge_id = challenge |> hash_challenge
  trace @"challenge_id:": challenge_id
  trace @"built_challenge_id:": built_challenge_id
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
