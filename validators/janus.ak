use aiken/builtin.{bytearray_to_integer, mod_integer}
use aiken/collection/dict
use aiken/collection/list
use aiken/collection/pairs
use aiken/crypto/bls12_381/scalar
use cardano/address.{Address, Credential, Inline, Script, VerificationKey}
use cardano/assets.{PolicyId, lovelace_of} as assets
use cardano/certificate.{
  Certificate, DelegateBlockProduction, DelegateCredential,
  DelegateRepresentative, DelegateVote, RegisterAndDelegateCredential,
  RegisterCredential,
}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction, find_input,
  find_script_outputs,
}
use types.{
  AccountDatum, AccountParameters, BurnAccount, CreateAccount, CreateCircuit,
  Delegate, DelegateDRep, MintRedeemer, PubSignals, PublishRedeemer, Register,
  RegisterAndDelegate, SpendRedeemer, WalletParameters, Withdraw,
  WithdrawRedeemer, ZkVerificationKey,
}
use utils.{
  build_challenge, evaluating_script, find_account_input, find_account_output,
  find_circuit_input, get_total_input_script_balance, hash_challenge,
  isAccountDatum, is_script_address, stakeRegistrationDeposit,
  to_scalar_overflow, validUpdateDatum, zk_verify,
}

validator wallet(params: WalletParameters) {
  mint(redeemer: MintRedeemer, policy_id: PolicyId, tx: Transaction) {
    let Transaction { outputs, mint, extra_signatories, .. } = tx
    trace @"owner": params.owner
    trace @"extra_signatories": extra_signatories
    expect [Pair(asset_name, amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()
    trace @"token asset_name": asset_name
    trace @"token amount": amount
    when redeemer is {
      CreateCircuit -> amount == 1 && {
          expect Some(_) =
            list.find(extra_signatories, fn(vkh) { vkh == params.owner })
          trace @"owner signed tx!!!"
          expect Some(output) =
            outputs
              |> find_account_output(policy_id, asset_name)
          trace @"output": output.address.payment_credential
          when output.address.payment_credential is {
            VerificationKey(_) -> False
            Script(script_hash) -> {
              // circuit sent to this script address
              expect policy_id == script_hash
              expect InlineDatum(data) = output.datum
              expect _: ZkVerificationKey = data
              True
            }
          }
        }
      CreateAccount -> amount == 1 && {
          expect Some(output) =
            outputs
              |> find_account_output(policy_id, asset_name)
          trace @"output": output.address.payment_credential
          when output.address.payment_credential is {
            VerificationKey(_) -> False
            Script(addr_hash) -> {
              // token not sent to this script address
              expect policy_id != addr_hash
              expect InlineDatum(data) = output.datum
              expect AccountDatum { user_id, script_hash, .. } = data
              asset_name == user_id && addr_hash == script_hash
            }
          }
        }

      BurnAccount -> todo
    }
  }

  else(_) {
    fail
  }
}

validator account(params: AccountParameters) {
  spend(
    datum: Option<Data>,
    redeemer: SpendRedeemer,
    self_ref: OutputReference,
    self_tx: Transaction,
  ) {
    let SpendRedeemer { self_idx, idx, jdx, signals: r_signals, proof: r_proof } =
      redeemer
    let Transaction { inputs, reference_inputs, redeemers, outputs, .. } =
      self_tx
    let AccountParameters {
      for_evaluation,
      policy_id,
      circuit_asset_name,
      asset_name,
      pwd_hash,
      pwd_kdf_hash,
      nonce: addr_nonce,
    } = params
    // check if updating password
    let isDatum = isAccountDatum(datum)
    // check script is evaluated whether it's here or by another script in the transaction. Return tuple (eval_script, eval_this)
    expect (True, eval_this) =
      evaluating_script(self_idx, idx, jdx, self_ref, inputs, redeemers)
    if eval_this == False {
      // can't bypass if UTxO carry account datum
      isDatum == None
    } else {
      expect Some(signals) = r_signals
      expect Some(proof) = r_proof
      let challenge_id = build_challenge(self_tx) |> hash_challenge
      trace @"tx challengeId": challenge_id
      trace @"signals challengeId": signals.challenge
      trace @"is for evaluation?": for_evaluation
      // Script for test is used to calculate ExUnits **ONLY** 
      // so we don't need to ask user to generated a proof/signals just for passing evaluation
      // instead we compare agains same value provided to guarantee same script ex steps
      if for_evaluation {
        // NOTE: this will **ALWAYS** pass
        expect
          signals.challenge == challenge_id || signals.challenge == signals.challenge
      } else {
        expect signals.challenge == challenge_id
      }
      expect Some(circuit_input) =
        reference_inputs
          |> find_circuit_input(policy_id, circuit_asset_name)
      expect InlineDatum(circuit_data) = circuit_input.output.datum
      expect zkey: ZkVerificationKey = circuit_data
      let account_data =
        when isDatum is {
          None -> {
            expect Some(account_input) =
              reference_inputs
                |> find_account_input(policy_id, asset_name)
            expect InlineDatum(data) = account_input.output.datum
            expect ref_data: AccountDatum = data
            ref_data
          }
          Some(d) -> {
            trace @"UTxO Stored AccountDatum": d
            expect validUpdateDatum(d, outputs, policy_id)
            d
          }
        }
      expect Some(input) =
        inputs
          |> transaction.find_input(self_ref)
      expect Script(addr_hash) = input.output.address.payment_credential
      let AccountDatum { user_id, hash: kdf_hash, nonce, script_hash } =
        account_data
      expect addr_hash == script_hash
      trace @"datum userId": user_id
      trace @"params userId": asset_name
      trace @"signals userId": signals.user_id
      expect asset_name == user_id
      expect signals.user_id == user_id
      trace @"params kdf hash": pwd_kdf_hash
      trace @"datum kdf_hash": kdf_hash
      expect pwd_kdf_hash == kdf_hash
      expect addr_nonce == nonce
      trace @"params credential hash": pwd_hash
      expect Some(scalar_user_id) = scalar.from_bytearray_big_endian(user_id)
      expect Some(scalar_cred_hash) = scalar.from_bytearray_big_endian(pwd_hash)
      expect Some(scalar_hash) = scalar.from_bytearray_big_endian(signals.hash)
      expect (Some(scalar_challenge), scalar_overflow) =
        to_scalar_overflow(challenge_id)
      // TODO: add challenge overflow to circuit
      trace @"userId (number)": scalar_user_id
      trace @"credentialHash (number)": scalar_cred_hash
      trace @"challenge (number)": scalar_challenge
      trace @"overflow (number)": scalar_overflow
      trace @"circuitHash (number)": scalar_hash
      let public =
        [
          scalar_user_id, scalar_cred_hash, scalar_challenge, scalar_overflow,
          scalar_hash,
        ]
      if for_evaluation {
        // NOTE: we're passing maximum values as public which are the only one affecting exUnits dynamically (pA, pB, pC cost is constant)
        // Since we're using Poseidon.hash we can't determine which password generate hash equal to scalar.field_prime - 1, therefore 
        // proof isn't valid.
        // builtin.bls12_381_g1_scalar_mul(scalar.to_int(e), point) // scalar.to_int(e) is each number in public
        // bls12_381_g1_scalar_mul: TwoArgumentsCosting::new(
        //    TwoArgumentsCosting::constant_cost(18),
        //    TwoArgumentsCosting::linear_in_x(76433006, 8868), // TwoArguments::LinearInX(l) => l.slope(=8868) * x(=scalar.to_int(e)) + l.intercept(=76433006),
        // ) 
        // max exUnit (cpu/steps): 10,000,000,000
        // max exUnit (mem): 14,000,000
        !zk_verify(proof, public, zkey)?
      } else {
        zk_verify(proof, public, zkey)?
      }
    }
  }

  publish(
    redeemer: PublishRedeemer,
    certificate: Certificate,
    self_tx: Transaction,
  ) {
    let Transaction { inputs, outputs, fee, .. } = self_tx
    when redeemer is {
      Register -> {
        expect RegisterCredential {
          credential: Script(script_hash),
          deposit: Never,
        } = certificate
        trace @"script hash": script_hash
        let input_lovelace =
          inputs
            |> get_total_input_script_balance(script_hash)
        expect [output] = outputs
        expect is_script_address(output.address, script_hash, True)
        lovelace_of(output.value) == input_lovelace - fee
      }
      RegisterAndDelegate -> {
        expect RegisterAndDelegateCredential {
          credential: Script(script_hash),
          delegate: DelegateBlockProduction { .. },
          deposit,
        } = certificate
        trace @"script hash": script_hash
        (deposit == stakeRegistrationDeposit)? && {
          let input_lovelace =
            inputs
              |> get_total_input_script_balance(script_hash)
          expect [output] = outputs
          expect is_script_address(output.address, script_hash, True)
          lovelace_of(output.value) == input_lovelace - deposit - fee
        }
      }
      Delegate -> {
        expect DelegateCredential {
          credential: Script(script_hash),
          delegate: DelegateBlockProduction { .. },
        } = certificate
        trace @"script hash": script_hash
        let input_lovelace =
          inputs
            |> get_total_input_script_balance(script_hash)
        expect [output] = outputs
        expect is_script_address(output.address, script_hash, True)
        lovelace_of(output.value) == input_lovelace - fee
      }
      DelegateDRep -> {
        expect DelegateCredential {
          credential: Script(script_hash),
          delegate: DelegateVote { .. },
        } = certificate
        trace @"script hash": script_hash
        let input_lovelace =
          inputs
            |> get_total_input_script_balance(script_hash)
        expect [output] = outputs
        expect is_script_address(output.address, script_hash, True)
        lovelace_of(output.value) == input_lovelace - fee
      }
    }
  }

  withdraw(_redeemer: Data, credential: Credential, self_tx: Transaction) {
    let Transaction { inputs, outputs, fee, withdrawals, .. } = self_tx
    expect Script(script_hash) = credential
    // check all inputs are from script address and collect all lovelace
    let input_lovelace =
      inputs
        |> get_total_input_script_balance(script_hash)
    // check there is only one output for script address with value (lovelace) = input + rewards - fee
    expect [output] = outputs
    expect is_script_address(output.address, script_hash, True)
    let output_lovelace = lovelace_of(output.value)
    let rewards =
      withdrawals
        |> pairs.get_all(credential)
        |> list.foldl(0, fn(lovelace, acc) { lovelace + acc })
    trace @"inputs lovelace:": input_lovelace
    trace @"output lovelace:": output_lovelace
    trace @"rewards to withdraw:": rewards
    trace @"fee:": fee
    output_lovelace == input_lovelace + rewards - fee
  }

  else(_) {
    fail
  }
}
