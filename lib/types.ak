use aiken/crypto.{Blake2b_224, Hash, ScriptHash, VerificationKeyHash}
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

pub type CircuitDatum {
  zkey: ZkVerificationKey,
}

pub type AccountDatum {
  user_id: ByteArray,
  hash: ByteArray,
  nonce: ByteArray,
  script_hash: ScriptHash,
}

pub type PubSignals {
  user_id: ByteArray,
  challenge: ByteArray,
  hash: ByteArray,
}

pub type Proof {
  p_a: ByteArray,
  p_b: ByteArray,
  p_c: ByteArray,
}

pub type SpendRedeemer {
  self_idx: Int,
  idx: Int,
  jdx: Int,
  signals: Option<PubSignals>,
  proof: Option<Proof>,
}

pub type WalletParameters {
  version: Int,
  owner: VerificationKeyHash,
  nounce: ByteArray,
}

pub type AccountParameters {
  policy_id: PolicyId,
  circuit_asset_name: AssetName,
  asset_name: AssetName,
  pwd_hash: ByteArray,
  pwd_kdf_hash: ByteArray,
  nonce: ByteArray,
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
  DelegateDRep
}

pub type WithdrawRedeemer {
  Withdraw
}

pub type MintRedeemer {
  CreateCircuit
  CreateAccount
  BurnAccount
}
