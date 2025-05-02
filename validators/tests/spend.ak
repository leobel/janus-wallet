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
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey = get_zkey()
  let nonce = #"1234567890"
  let accountData = AccountDatum { user_id, hash, nonce }
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
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
      1213068129888263879523280420374147302574367144364172966430678699081284544200,
      32,
    )
  let signals = PubSignals { user_id, challenge, hash: circuit_hash }
  let p_a =
    #"b960a5fe0960509eecb023ea841a205f7c4503925403e0dfd91d2acfcfb14fbf43388932cca1e2edc4a60aa2ac52c538"
  let p_b =
    #"9921309affa531a83edbeec14f5b1f9ee5dabebe6c4dbfab7a9efe75e0b098a65ce404a71cf105b038d8e0ae92e4241019470d52764f84818d736655d9075b5f7a92175d611b575447928c5bf3e71c0cca8de85cbd8ee60e1431217e2c701429"
  let p_c =
    #"a7a95e9ec8beaf56a90bd046f6dd930f795e834e2d7d8ffba9b13050a1c756ad61e6ffa4b5710cceb25f10e75f04b826"
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
  let accountData = AccountDatum { user_id, hash, nonce }
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
  let scriptHash = #"a1715c515e4b0d213115f5faada8f0daf93598297cfc65166e2bbd2d"
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
      nonce: #"",
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference1, tx)
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
