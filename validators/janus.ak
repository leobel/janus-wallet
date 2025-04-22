use aiken/builtin.{bytearray_to_integer, mod_integer}
use aiken/crypto/bls12_381/scalar
use cardano/address.{Credential, Script}
use cardano/assets.{PolicyId} as assets
use cardano/certificate.{
  Certificate, DelegateBlockProduction, DelegateCredential,
  RegisterAndDelegateCredential, RegisterCredential,
}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use types.{
  AccountParameters, Delegate, Parameters, PubSignals, PublishRedeemer, Register,
  RegisterAndDelegate, SpendRedeemer, Withdraw, WithdrawRedeemer, ZkDatum,
}
use utils.{
  build_challenge, evaluating_script, find_account_input, hash_challenge,
  include_script_input, stakeRegistrationDeposit, zk_verify,
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
    redeemer: SpendRedeemer,
    self_ref: OutputReference,
    self_tx: Transaction,
  ) {
    let SpendRedeemer { idx, jdx, signals: r_signals, proof: r_proof } =
      redeemer
    let Transaction { inputs, reference_inputs, redeemers, .. } = self_tx
    // check script is evaluated whether it's here or by another script in the transaction. Return tuple (eval_script, eval_this)
    expect (True, eval_this) =
      evaluating_script(inputs, redeemers, self_ref, idx, jdx)
    if eval_this == False {
      True
    } else {
      expect Some(signals) = r_signals
      expect Some(proof) = r_proof
      let challengeId = build_challenge(self_tx) |> hash_challenge
      trace @"challengeId": challengeId
      trace @"signals challengeId": signals.challenge
      trace @"is for evaluation?": if params.for_evaluation {
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
      if params.for_evaluation {
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
