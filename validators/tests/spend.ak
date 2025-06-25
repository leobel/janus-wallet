use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey, with_delegation_script}
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Redeemer, Spend,
  Transaction,
}
use janus
use types.{
  AccountDatum, AccountParameters, Proof, PubSignals, SpendRedeemer,
  ZkVerificationKey,
}
use utils.{build_challenge, hash_challenge}

test spend_evaluating_real_script() {
  let user_id = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      38358706005010237984897052131059375087277120723539046063548902418320083744329,
      32,
    )
  let zkey = get_zkey()
  let nonce = #"1234567890"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let accountData =
    AccountDatum { user_id, hash, nonce, script_hash: scriptHash }
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let address = get_script_address(scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let circuit_asset_name = #"466f6e74757323303031"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: InlineDatum(accountData),
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
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
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input, circuit_input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let challenge = build_challenge(tx) |> hash_challenge
  let circuit_hash =
    bytearray.from_int_big_endian(
      51144372254986188763633616671201291769628063042926002312308424635337077359052,
      32,
    )
  let signals = PubSignals { user_id, challenge, hash: circuit_hash }
  let p_a =
    #"9054e3e899146c70a33e935e00cbed99060c06afcfd53b7c6fc864f7b07b3386e2e27dc798d38f2132dc651c5351b5aa"
  let p_b =
    #"8d50967cb959e3b2f66df90703a9e5c41e7a4ab0fc60beea301715357a924696400b76262574e3e3be24e95e75ef84f41804b086cde3319248841c64671cd0bb106aab87e0ea4c2922e1f80377cd10dd6fcfcef1942cf822747d064f35368f5b"
  let p_c =
    #"b1adbf6f6c6378a60e9a9c883a15a4b31113a8cb9d13afcb5db45ea0426fe7ce1d5484d0234a3cb71119e061700e047f"
  let proof = Proof { p_a, p_b, p_c }
  // trace @"serialise (challenge)": build_challenge(tx) |> cbor.serialise
  let redeemer =
    SpendRedeemer {
      self_idx: 0,
      idx: 0,
      jdx: 0,
      signals: Some(signals),
      proof: Some(proof),
    }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name,
      pwd_hash: hash,
      pwd_kdf_hash: hash,
      nonce,
      for_evaluation: False,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
}

test spend_evaluating_script() {
  let user_id = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey = get_zkey()
  let nonce = #"1234567890"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let accountData =
    AccountDatum { user_id, hash, nonce, script_hash: scriptHash }
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let address = get_script_address(scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let circuit_asset_name = #"466f6e74757323303031"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: InlineDatum(accountData),
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
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
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input, circuit_input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let challenge = build_challenge(tx) |> hash_challenge
  let signals = PubSignals { user_id, challenge, hash }
  let p_a =
    #"b5954b04ea1d2956fac946a3dabbe826cc4651322c23423a245d65f528bd5adead5aee7cbcfc3d86ae96a9ecfc40d3e8"
  let p_b =
    #"a3f50879ce5f27741ef8b0dfaf4b100f1fbc9ed503c2edd901dfbd080c449e40c97c8e465d191514565ede494209181e00f121f68062b2e6048d566ccfab5bd01271ade34d9e07362c41635ea371aef4487302db945e8aa8664ed73214a68216"
  let p_c =
    #"aa0b4443bb50d1c93ce088b2df5abb315fceb183c709008e071c196ae4e6d1a969ed62b747f4bf84e9d22eea9278dd9a"
  let proof = Proof { p_a, p_b, p_c }
  // trace @"serialise (challenge)": build_challenge(tx) |> cbor.serialise
  let redeemer =
    SpendRedeemer {
      self_idx: 0,
      idx: 0,
      jdx: 0,
      signals: Some(signals),
      proof: Some(proof),
    }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name,
      pwd_hash: hash,
      pwd_kdf_hash: hash,
      nonce,
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
}

test spend_evaluating_bypass() {
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }
  let address = with_delegation_script(addr, scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name: #"",
      pwd_hash: #"",
      pwd_kdf_hash: #"",
      nonce: #"",
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference1, tx)
}

test spend_evaluating_wrong_datum_script() fail {
  let user_id = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey = get_zkey()
  let nonce = #"1234567890"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let otherScriptHash =
    #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2a"
  let accountData =
    AccountDatum { user_id, hash, nonce, script_hash: otherScriptHash }
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let address = get_script_address(scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let circuit_asset_name = #"466f6e74757323303031"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: InlineDatum(accountData),
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
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
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input, circuit_input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let challenge = build_challenge(tx) |> hash_challenge
  let signals = PubSignals { user_id, challenge, hash }
  let p_a =
    #"b5954b04ea1d2956fac946a3dabbe826cc4651322c23423a245d65f528bd5adead5aee7cbcfc3d86ae96a9ecfc40d3e8"
  let p_b =
    #"a3f50879ce5f27741ef8b0dfaf4b100f1fbc9ed503c2edd901dfbd080c449e40c97c8e465d191514565ede494209181e00f121f68062b2e6048d566ccfab5bd01271ade34d9e07362c41635ea371aef4487302db945e8aa8664ed73214a68216"
  let p_c =
    #"aa0b4443bb50d1c93ce088b2df5abb315fceb183c709008e071c196ae4e6d1a969ed62b747f4bf84e9d22eea9278dd9a"
  let proof = Proof { p_a, p_b, p_c }
  // trace @"serialise (challenge)": build_challenge(tx) |> cbor.serialise
  let redeemer =
    SpendRedeemer {
      self_idx: 0,
      idx: 0,
      jdx: 0,
      signals: Some(signals),
      proof: Some(proof),
    }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name,
      pwd_hash: hash,
      pwd_kdf_hash: hash,
      nonce,
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
}

test spend_evaluating_wrong_self_ref() fail {
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }
  let address = with_delegation_script(addr, scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let spendUtxo =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name: #"",
      pwd_hash: #"",
      pwd_kdf_hash: #"",
      nonce: #"",
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, spendUtxo, tx)
}

test spend_evaluating_no_script() fail {
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }
  let address = with_delegation_script(addr, scriptHash)
  let normalAddress =
    Address { payment_credential: VerificationKey(#""), stake_credential: None }
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: -1, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 0, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: OutputReference {
            transaction_id: #"",
            output_index: 0,
          },
          output: Output {
            address: normalAddress,
            value: assets.from_lovelace(10000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let redeemer =
    SpendRedeemer { self_idx: 0, idx: 0, jdx: -1, signals: None, proof: None }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name: #"",
      pwd_hash: #"",
      pwd_kdf_hash: #"",
      nonce: #"",
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
}

test spend_evaluating_wrong_target() fail {
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }
  let address = with_delegation_script(addr, scriptHash)
  let policy_id = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let asset_name = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policy_id, [Pair(asset_name, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let scriptOutputReference =
    OutputReference { transaction_id: scriptTxId, output_index: 0 }
  let scriptOutputReference1 =
    OutputReference { transaction_id: scriptTxId, output_index: 1 }
  let scriptOutputReference2 =
    OutputReference { transaction_id: scriptTxId, output_index: 2 }
  let scriptRedeemer: Redeemer =
    SpendRedeemer { self_idx: 0, idx: 1, jdx: -1, signals: None, proof: None }
  let scriptRedeemer1: Redeemer =
    SpendRedeemer { self_idx: 1, idx: 0, jdx: 0, signals: None, proof: None }
  let scriptRedeemer2: Redeemer =
    SpendRedeemer { self_idx: 2, idx: 1, jdx: -1, signals: None, proof: None }
  let redeemers =
    [
      Pair(Spend(scriptOutputReference), scriptRedeemer),
      Pair(Spend(scriptOutputReference1), scriptRedeemer1),
      Pair(Spend(scriptOutputReference2), scriptRedeemer2),
    ]
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: scriptOutputReference,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference1,
          output: Output {
            address,
            value: assets.from_lovelace(50000000),
            datum: NoDatum,
            reference_script: None,
          },
        },
        Input {
          output_reference: scriptOutputReference2,
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
          datum: NoDatum,
          reference_script: None,
        },
        Output {
          address,
          value: assets.merge(assets.from_lovelace(39614719), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      redeemers: redeemers,
      mint: mint,
    }
  let redeemer =
    SpendRedeemer { self_idx: 2, idx: 1, jdx: -1, signals: None, proof: None }
  let params =
    AccountParameters {
      policy_id,
      asset_name,
      circuit_asset_name: #"",
      pwd_hash: #"",
      pwd_kdf_hash: #"",
      nonce: #"",
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
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
