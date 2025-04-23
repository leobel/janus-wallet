use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey, with_delegation_script}
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Redeemer, Spend,
  Transaction,
}
use janus
use types.{
  AccountParameters, Proof, PubSignals, SpendRedeemer, ZkDatum,
  ZkVerificationKey,
}
use utils.{build_challenge, hash_challenge}

test spend_evaluating_script() {
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
  let scriptTxId =
    #"3658cf03ab7407f816548e5a465b6f51779be54bb45f57155776864e454804ac"
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
      redeemers: redeemers,
      mint: mint,
    }
  let challenge = build_challenge(tx) |> hash_challenge
  let signals = PubSignals { userId, challenge, hash }
  let pA =
    #"b5954b04ea1d2956fac946a3dabbe826cc4651322c23423a245d65f528bd5adead5aee7cbcfc3d86ae96a9ecfc40d3e8"
  let pB =
    #"a3f50879ce5f27741ef8b0dfaf4b100f1fbc9ed503c2edd901dfbd080c449e40c97c8e465d191514565ede494209181e00f121f68062b2e6048d566ccfab5bd01271ade34d9e07362c41635ea371aef4487302db945e8aa8664ed73214a68216"
  let pC =
    #"aa0b4443bb50d1c93ce088b2df5abb315fceb183c709008e071c196ae4e6d1a969ed62b747f4bf84e9d22eea9278dd9a"
  let proof = Proof { pA, pB, pC }
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
      policy_id: policyId,
      asset_name: assetName,
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
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
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
      policy_id: policyId,
      asset_name: assetName,
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
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
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
      policy_id: policyId,
      asset_name: assetName,
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
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
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
      policy_id: policyId,
      asset_name: assetName,
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
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 1500000)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: NoDatum,
      reference_script: None,
    }
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
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
      policy_id: policyId,
      asset_name: assetName,
      for_evaluation: True,
    }
  janus.account.spend(params, None, redeemer, scriptOutputReference, tx)
}
