use cardano/transaction
use janus
use types.{Parameters}

test mint_ok() {
  let params =
    Parameters {
      // policy: #"000000000000000000000000",
      nounce: #"000000000000000000000000",
    }
  let data = #"000000000000000000000000"
  let policyId = #"92f2a8a5a3d76c31623ef7919b90d7bae4ad9176787f0883dd8c2f51"
  janus.wallet.mint(params, data, policyId, transaction.placeholder)
}
