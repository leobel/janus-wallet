use aiken/crypto.{Blake2b_224, Hash, ScriptHash}
use cardano/address.{Address}
use cardano/assets.{AssetName, PolicyId}
use cardano/certificate.{Certificate}
use cardano/transaction.{OutputReference, Transaction}

pub type ZkVerificationKey {
  // G1Element
  vk_alpha1: ByteArray,
  // G2Element
  vk_beta2: ByteArray,
  // G2Element
  vk_gamma2: ByteArray,
  // G2Element
  vk_delta2: ByteArray,
  // List<G1Element>
  vk_ic: List<ByteArray>,
}

pub type ZkDatum {
  userId: ByteArray,
  hash: ByteArray,
  zkey: ZkVerificationKey,
}

pub type PubSignals {
  userId: ByteArray,
  challenge: ByteArray,
  hash: ByteArray,
}

pub type Proof {
  pA: ByteArray,
  pB: ByteArray,
  pC: ByteArray,
}

pub type Redeemer {
  idx: Option<Int>,
  signals: Option<PubSignals>,
  proof: Option<Proof>,
}

pub type Parameters {
  // policy: ByteArray,
  nounce: ByteArray,
}

pub type AccountParameters {
  policy_id: PolicyId,
  asset_name: AssetName,
  for_evaluation: Bool,
}

pub type Challenge {
  reference_inputs: List<OutputReference>,
  inputs: List<OutputReference>,
  outputs: List<ChallengeOutput>,
  mint: ByteArray,
  certificates: List<Certificate>,
}

pub type ChallengeId =
  Hash<Blake2b_224, Transaction>

pub type ChallengeOutput {
  address: Address,
  value: ByteArray,
  datum: ByteArray,
  reference_script: Option<ScriptHash>,
}

pub type PublishRedeemer {
  Register
  RegisterAndDelegate
  Delegate
}

pub type WithdrawRedeemer {
  Withdraw
}
