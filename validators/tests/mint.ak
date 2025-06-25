use aiken/crypto.{ScriptHash}
use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey, with_delegation_script}
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction,
}
use janus
use types.{
  AccountDatum, CreateAccount, CreateCircuit, WalletParameters,
  ZkVerificationKey,
}

// MINT ACCOUNT
test mint_account_ok() {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, script_hash, nonce)
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  let address = with_delegation_script(addr, script_hash)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

test mint_account_update_token() {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr: Data = #""
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, script_hash, nonce)
  let new_script_hash =
    #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let new_hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363679,
      32,
    )
  let new_nonce = #"123456789a"
  let new_datum = get_datum(assetName, new_hash, new_script_hash, new_nonce)
  let address =
    with_delegation_script(
      Address {
        payment_credential: Script(script_hash),
        stake_credential: None,
      },
      script_hash,
    )
  let new_address =
    with_delegation_script(
      Address {
        payment_credential: Script(new_script_hash),
        stake_credential: None,
      },
      new_script_hash,
    )
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let outputReference =
    OutputReference { transaction_id: txId, output_index: 0 }
  let tx =
    Transaction {
      ..transaction.placeholder,
      inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      reference_inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: new_address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(new_datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }

  janus.wallet.spend(params, Some(datum), rdmr, outputReference, tx)
}

test mint_account_update_token_missing_output_datum() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr: Data = #""
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, script_hash, nonce)
  let new_script_hash =
    #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let address =
    with_delegation_script(
      Address {
        payment_credential: Script(script_hash),
        stake_credential: None,
      },
      script_hash,
    )
  let new_address =
    with_delegation_script(
      Address {
        payment_credential: Script(new_script_hash),
        stake_credential: None,
      },
      new_script_hash,
    )
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let outputReference =
    OutputReference { transaction_id: txId, output_index: 0 }
  let tx =
    Transaction {
      ..transaction.placeholder,
      inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      reference_inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: new_address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }

  janus.wallet.spend(params, Some(datum), rdmr, outputReference, tx)
}

test mint_account_update_token_wrong_output() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr: Data = #""
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, script_hash, nonce)
  let new_script_hash =
    #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let new_hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363679,
      32,
    )
  let new_nonce = #"123456789a"
  let new_datum = get_datum(assetName, new_hash, new_script_hash, new_nonce)
  let address =
    with_delegation_script(
      Address {
        payment_credential: Script(script_hash),
        stake_credential: None,
      },
      script_hash,
    )
  let new_address =
    with_delegation_script(
      Address {
        payment_credential: Script(new_script_hash),
        stake_credential: None,
      },
      new_script_hash,
    )
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let txId = #"b8b523b596040bb749b23848ea976ee238d5693dca8daa3771e17f3874a9c17e"
  let outputReference =
    OutputReference { transaction_id: txId, output_index: 0 }
  let tx =
    Transaction {
      ..transaction.placeholder,
      inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      reference_inputs: [
        Input {
          output_reference: outputReference,
          output: Output {
            address,
            value: assets.merge(assets.from_lovelace(1000000), mint),
            datum: InlineDatum(datum),
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: new_address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(new_datum),
          reference_script: None,
        },
        Output {
          address,
          value: assets.from_lovelace(1000000),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }

  janus.wallet.spend(params, Some(datum), rdmr, outputReference, tx)
}

test mint_account_invalid_datum() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let datum: Data = #""
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  let address = with_delegation_script(addr, script_hash)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

test mint_account_different_user_id() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(#"1234", hash, script_hash, nonce)
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  let address = with_delegation_script(addr, script_hash)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

test mint_account_different_output_script() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let other_script_hash =
    #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, other_script_hash, nonce)
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  let address = with_delegation_script(addr, script_hash)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

test mint_account_send_to_same_script() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"2001b7fbb6f955482edc974b2afd47ca11d259707e0e5207498eb595"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, script_hash, nonce)
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(policyId), stake_credential: None }
  let address = with_delegation_script(addr, policyId)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

test mint_account_send_to_pub_prv_key() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateAccount
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let scriptHash = #"2001b7fbb6f955482edc974b2afd47ca11d259707e0e5207498eb595"
  let assetName = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let nonce = #"1234567890"
  let datum = get_datum(assetName, hash, scriptHash, nonce)
  let mint = assets.from_asset_list([Pair(policyId, [Pair(assetName, 1)])])
  let addr =
    Address {
      payment_credential: VerificationKey(policyId),
      stake_credential: None,
    }
  let address = with_delegation_script(addr, policyId)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policyId, tx)
}

// MINT CIRCUIT
test mint_circuit_ok() {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateCircuit
  let policy_id = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let asset_name = #"466f6e74757323303030"
  let datum = get_zkey()
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let addr =
    Address { payment_credential: Script(policy_id), stake_credential: None }
  let address = with_delegation_script(addr, policy_id)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policy_id, tx)
}

test mint_circuit_invalid_no_signed() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateCircuit
  let policy_id = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let asset_name = #"466f6e74757323303030"
  let datum = get_zkey()
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let addr =
    Address { payment_credential: Script(policy_id), stake_credential: None }
  let address = with_delegation_script(addr, policy_id)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [],
    }
  janus.wallet.mint(params, rdmr, policy_id, tx)
}

test mint_circuit_invalid_datum() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateCircuit
  let policy_id = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let assetName = #"466f6e74757323303030"
  let datum: Data = #""
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(assetName, 1)])])
  let addr =
    Address { payment_credential: Script(policy_id), stake_credential: None }
  let address = with_delegation_script(addr, policy_id)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policy_id, tx)
}

test mint_circuit_send_to_different_script() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateCircuit
  let policy_id = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let script_hash = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f50"
  let asset_name = #"466f6e74757323303030"
  let datum = get_zkey()
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let addr =
    Address { payment_credential: Script(script_hash), stake_credential: None }
  let address = with_delegation_script(addr, script_hash)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policy_id, tx)
}

test mint_circuit_send_to_pub_prv_script() fail {
  let params =
    WalletParameters {
      version: 0,
      owner: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let rdmr = CreateCircuit
  let policy_id = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  let asset_name = #"466f6e74757323303030"
  let datum = get_zkey()
  let mint = assets.from_asset_list([Pair(policy_id, [Pair(asset_name, 1)])])
  let addr =
    Address {
      payment_credential: VerificationKey(policy_id),
      stake_credential: None,
    }
  let address = with_delegation_script(addr, policy_id)
  let tx =
    Transaction {
      ..transaction.placeholder,
      mint: mint,
      outputs: [
        Output {
          address,
          value: assets.merge(assets.from_lovelace(1000000), mint),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      extra_signatories: [params.owner],
    }
  janus.wallet.mint(params, rdmr, policy_id, tx)
}

fn get_datum(
  user_id: ByteArray,
  hash: ByteArray,
  script_hash: ScriptHash,
  nonce: ByteArray,
) -> AccountDatum {
  AccountDatum { user_id, hash, nonce, script_hash }
}

fn get_zkey() -> ZkVerificationKey {
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
}
