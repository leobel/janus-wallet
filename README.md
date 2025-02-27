# Janus Wallet

Simplified Cardano Onboarding with ZK Proofs

```cli
node --experimental-specifier-resolution=node --loader ts-node/esm src/prepare-contracts.ts

node --experimental-specifier-resolution=node --loader ts-node/esm src/register-stake.ts
```
    

## Test
```cli
aiken check -m janus.verify_ok
aiken check -m tests.verify_zk_proof_per
```
