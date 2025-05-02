## Prepare the project
let's just start installing all project's dependencies with:
```jsx
npm install
```

## Obtaining a ZK-SNARK circuit (GROTH16)
- Online using zkrepl.dev:
Go to https://zkrepl.dev and replace current code with your circon code in the editor. You can then add some inputs to verify it with command `shift+enter`:
```json
/* INPUT = {
    "userId": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challenge": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challengeFlag": "1",
    "hash": "7507823236105502751361814670776963121972651270405097442444326619292614813323",
    "pwd": "52435875175126190479447740508185965837690552500527637822603658699938581184512"
} */
```
To generate circuit ZK Verification keys click on "Groth16" button, then download file `main.groth16.vkey.json`
> ⚠️ **WARNING:** These keys are strictly for testing purposes, and are generated without a proper trusted setup!

- Locally using `snarkjs` cli:
First install `snarkjs` globally following installation guide [here](https://github.com/iden3/snarkjs?tab=readme-ov-file#install-node). Once `snarkjs` is installed we can proceed to generate the ZK Verification keys as follow:

### Phase 1 Trusted Setup
**1. Start a new powers of tau ceremony**

```jsx
snarkjs powersoftau new bls12381 14 pot14_0000.ptau -v
```

The `new` command is used to start a powers of tau ceremony. The first parameter after `new` refers to the type of curve you wish to use. At the moment, we support both `bn128` and `bls12-381`. The second parameter, in this case `14`, is the power of two of the maximum number of constraints that the ceremony can accept: in this case, the number of constraints is `2 ^ 14 = 16,384`. The maximum value supported here is `28`, which means you can use `snarkjs` to securely generate zk-snark parameters for circuits with up to `2 ^ 28` (≈268 million) constraints.

**2. Contribute to the ceremony**

```jsx
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v
```

The `contribute` command creates a ptau file with a new contribution. You'll be prompted to enter some random text to provide an extra source of entropy. `contribute` takes as input the transcript of the protocol so far, in this case `pot14_0000.ptau`, and outputs a new transcript, in this case `pot14_0001.ptau`, which includes the computation carried out by the new contributor (`ptau` files contain a history of all the challenges and responses that have taken place so far). `name` can be anything you want, and is just included for reference (it will be printed when you verify the file (step 5).

**3. Provide a second contribution**

```jsx
snarkjs powersoftau contribute pot14_0001.ptau pot14_0002.ptau --name="Second contribution" -v -e="some random text"
```

By letting you write the random text as part of the command, the `-e` parameter allows `contribute` to be non-interactive.

**4.1 Provide a third contribution using third-party software (export current challenge)**

```jsx
snarkjs powersoftau export challenge pot14_0002.ptau challenge_0003

```

**4.2 Provide a third contribution using third-party software (third-party contribute exported challenge)**

```jsx
snarkjs powersoftau challenge contribute bls12381 challenge_0003 response_0003 -e="some random text"
```

**4.3 Provide a third contribution using third-party software (import third-party contribution)**

```jsx
snarkjs powersoftau import response pot14_0002.ptau response_0003 pot14_0003.ptau -n="Third contribution name"
```
This allows you to use different types of software in a single ceremony.

**5. Verify the protocol so far**

```jsx
snarkjs powersoftau verify pot14_0003.ptau
```
The `verify` command verifies a `ptau` (powers of tau) file, which means it checks all the contributions to the multi-party computation (MPC) up to that point. It also prints the hashes of all the intermediate results to the console.

If everything checks out, you should see the following at the top of the output:
```jsx
[WARN]  snarkJS: this file does not contain phase2 precalculated values. Please run: 
   snarkjs "powersoftau preparephase2" to prepare this file to be used in the phase2 ceremony.
[INFO]  snarkJS: Powers Of tau OK!
```
In sum, whenever a new zk-snark project needs to perform a trusted setup, you can just pick the latest ptau file, and run the verify command to verify the entire chain of challenges and responses so far.

**6. Apply a random beacon**

```jsx
snarkjs powersoftau beacon pot14_0003.ptau pot14_beacon.ptau 3c692631872308ff1f9fed102b940aecee160def9c2478b50b977091 10 -n="Final Beacon"
```
The `beacon` command creates a `ptau` file with a contribution applied in the form of a random beacon.

We need to apply a random beacon in order to finalize phase 1 of the trusted setup.

> To paraphrase Sean Bowe and Ariel Gabizon, a random beacon is a source of public randomness that is not available before a fixed time. The beacon itself can be a delayed hash function (e.g. 2^40 iterations of SHA256) evaluated on some high entropy and publicly available data. Possible sources of data include: the closing value of the stock market on a certain date in the future, the output of a selected set of national lotteries, or the value of a block at a particular height in one or more blockchains. E.g. the hash of the 11 millionth Ethereum block (which as of this writing is some 3 months in the future). See [here](https://eprint.iacr.org/2017/1050.pdf) for more on the importance of a random beacon.
> 

For the purposes of this guide, the beacon is essentially a delayed hash function evaluated on `3c692631872308ff1f9fed102b940aecee160def9c2478b50b977091` (in practice this value will be some form of high entropy and publicly available data of your choice: e.g **Janus Wallet** will be using the `policy_id` under which all account tokens will be minted). The next input (in our case `10`) just tells `snarkjs` to perform `2 ^ 10` iterations of this hash function.

> **Note** that security holds even if an adversary has limited influence on the beacon.

**7. Prepare phase 2**

```jsx
snarkjs powersoftau prepare phase2 pot14_beacon.ptau pot14_final.ptau -v
```
We're now ready to prepare phase 2 of the setup (the circuit-specific phase).

Under the hood, the `prepare phase2` command calculates the encrypted evaluation of the Lagrange polynomials at tau for `tau`, `alpha*tau`, and `beta*tau`. It takes the beacon `ptau` file we generated in the previous step and outputs a final `ptau` file which will be used to generate the circuit proving and verification keys.

You can find more information about the ceremony [here](https://github.com/privacy-scaling-explorations/perpetualpowersoftau)

**8. Verify the final `ptau`** 

```jsx
snarkjs powersoftau verify pot14_final.ptau
```
The `verify` command verifies a powers of tau file.

Before we go ahead and create the circuit, we perform a final check and verify the final protocol transcript.

> **NOTICE** there is no longer a warning informing you that the file does not contain phase 2 precalculated values.


**9. Create the circuit**

```jsx
cat <<EOT > circuit.circom
pragma circom 2.1.6;

// make sure to indicate a path to `poseidon.circom` that would be reachable from where you're going to run the compile command
include "../../../node_modules/circomlib/circuits/poseidon.circom";

template Authenticate() {
    signal input userId; // Public user id (this could be a username or session id from Auth providers like Google)
    signal input challenge; // Public challenge the SC will require to match (this value will change on each successful tx so you can't use same proof twice)
    signal input challengeFlag; // Public flag indicating whether challenge overflow or not
    signal input hash; // Public user password hash
    signal input pwd;  // Private user password

    // Step 1: Hash the provided password
    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== pwd;
    poseidon.inputs[1] <== userId;
    poseidon.inputs[2] <== challenge;
    poseidon.inputs[3] <== challengeFlag;

    // deugging (Optional)
    log("hash", poseidon.out);

    // Step 2: Ensure the provided password matches the known hash
    hash === poseidon.out;
}

component main {public [userId, challenge, challengeFlag, hash]} = Authenticate();
EOT
```

**10. Compile the circuit**
In order to compile our circuit we must have `circom` installed. You can follow the instructions [here](https://docs.circom.io/getting-started/installation/). You may noticed circuit above have a dependency to `poseidon`, a [ZK friendly hashing function](https://www.poseidon-hash.info/). We can get access to it from project `circomlib` which contains a library of circuit templates with `poseidon` among them (`include "node_modules/circomlib/circuits/poseidon.circom";`). We can install `circomlib` via npm: `npm i -D circomlib`. The following command will compile the circuit and save it in the same folder where is executed.

```jsx
circom --r1cs --wasm --c --sym --inspect --prime bls12381 circuit.circom -o .
```
> ⚠️ **WARNING:** Make sure to run this command from dir where your `include ...` can hit the `poseidon` library. For this project it'll be at `/src/zkproof/janus-wallet` with circuit code reference: `include "../../../node_modules/circomlib/circuits/poseidon.circom";`

The `circom` command takes one input (the circuit to compile, in our case `circuit.circom`) and three options:

- `r1cs`: generates `circuit.r1cs` (the r1cs constraint system of the circuit in binary format).
- `wasm`: generates `circuit.wasm` (the wasm code to generate the witness – more on that later).
- `c`: generates c++ witness calculator code.
- `sym`: generates `circuit.sym` (a symbols file required for debugging and printing the constraint system in an annotated mode).
- `inspect`: does additional checks over the constraints produced.
- `prime`:  choose the prime number to use to generate the circuit. Receives the
name of the curve (bn128, bls12377, bls12381, goldilocks, grumpkin, pallas,
secq256r1, vesta) [default: bn128]

**11. View information about the circuit**

```jsx
snarkjs r1cs info circuit.r1cs
```
Output will looks like this:
```jsx
[INFO]  snarkJS: Curve: bls12-381
[INFO]  snarkJS: # of Wires: 741
[INFO]  snarkJS: # of Constraints: 736
[INFO]  snarkJS: # of Private Inputs: 1
[INFO]  snarkJS: # of Public Inputs: 4
[INFO]  snarkJS: # of Labels: 1173
[INFO]  snarkJS: # of Outputs: 0
```
The information fits out understanding of the circuit where we pass in four public data: `userId, challenge, challengeFlag, hash`

**12. Print the constraints**

```jsx
snarkjs r1cs print circuit.r1cs circuit.sym
```

**13. Export r1cs to json**
We can export the compiled circuit to json to make it human-readable.
```jsx
snarkjs r1cs export json circuit.r1cs circuit.r1cs.json
cat circuit.r1cs.json
```

**14. Calculate the witness**
First, we create a file with the inputs for our circuit:

```jsx
cat <<EOT > input.json
{
    "userId": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challenge": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challengeFlag": "1",
    "hash": "7872546840633957424423922093117117055086684658853702699218477667386254515905",
    "pwd": "52435875175126190479447740508185965837690552500527637822603658699938581184512"
}
EOT
```
Note that integers in json file are enclosed in double quotation marks, because otherwise json format loses precision when working with big integers.

Now, we use the `WASM` program created by circom in the directory <circuit_name>_js to create the witness (values of all the wires) for our inputs:

**14.1 Calculate the witness**

```jsx
snarkjs wtns calculate circuit_js/circuit.wasm input.json witness.wtns
```

**14.2 Check if the generated witness complies with the `r1cs`**

```jsx
snarkjs wtns check circuit.r1cs witness.wtns
```
Output should be something like this:
```jsx
[INFO]  snarkJS: WITNESS CHECKING STARTED
[INFO]  snarkJS: > Reading r1cs file
[INFO]  snarkJS: > Reading witness file
[INFO]  snarkJS: ----------------------------
[INFO]  snarkJS:   WITNESS CHECK
[INFO]  snarkJS:   Curve:          bls12381
[INFO]  snarkJS:   Vars (wires):   741
[INFO]  snarkJS:   Outputs:        0
[INFO]  snarkJS:   Public Inputs:  4
[INFO]  snarkJS:   Private Inputs: 1
[INFO]  snarkJS:   Labels:         1173
[INFO]  snarkJS:   Constraints:    736
[INFO]  snarkJS:   Custom Gates:   false
[INFO]  snarkJS: ----------------------------
[INFO]  snarkJS: > Checking witness correctness
[INFO]  snarkJS: WITNESS IS CORRECT
[INFO]  snarkJS: WITNESS CHECKING FINISHED SUCCESSFULLY
```

**14.3 Export witness to JSON**

```jsx
snarkjs wtns export json witness.wtns witness.json
```
### Phase 2 Trusted Setup
**15. Setup**
Here we'll using the power of tau file generated during the trusted ceremony in Phase 1

```jsx
snarkjs groth16 setup circuit.r1cs pot14_final.ptau circuit_0000.zkey
```
This generates the reference `zkey` (e.g `circuit_0000.zkey`) without phase 2 contributions.

> **IMPORTANT**: Do not use this zkey in production, as it's not safe. It requires at least one contribution.

The `zkey new` command creates an initial `zkey` file with zero contributions.

The `zkey` is a zero-knowledge key that includes both the proving and verification keys as well as phase 2 contributions.

Importantly, one can verify whether a `zkey` belongs to a specific circuit or not.

Note that `circuit_0000.zkey` (the output of the `zkey` command above) does not include any contributions yet, so it cannot be used in a final circuit.

*The following steps (16-20) are similar to the equivalent phase 1 steps, except we use `zkey` instead of `powersoftau` as the main command, and we generate `zkey` rather than `ptau` files.*

**16. Contribute to the phase 2 ceremony**

```jsx
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="1st Contributor Name" -v
```
The `zkey contribute` command creates a `zkey` file with a new contribution.

As in phase 1, you'll be prompted to enter some random text to provide an extra source of entropy.

**17. Provide a second contribution**

```jsx
snarkjs zkey contribute circuit_0001.zkey circuit_0002.zkey --name="Second contribution Name" -v -e="Another random entropy"
```

**18. Provide a third contribution using third-party software**
```jsx
snarkjs zkey export bellman circuit_0002.zkey challenge_phase2_0003
snarkjs zkey bellman contribute bls12381 challenge_phase2_0003 response_phase2_0003 -e="some random text"
snarkjs zkey import bellman circuit_0002.zkey response_phase2_0003 circuit_0003.zkey -n="Third contribution name"
```

**19. Verify the latest `zkey`**
```jsx
snarkjs zkey verify circuit.r1cs pot14_final.ptau circuit_0003.zkey
```
The `zkey verify` command verifies a `zkey` file. It also prints the hashes of all the intermediary results to the console.

We verify the `zkey` file we created in the previous step, which means we check all the contributions to the second phase of the multi-party computation (MPC) up to that point.

This command also checks that the `zkey` file matches the circuit.

If everything checks out, you should see the following:
```jsx
[INFO]  snarkJS: ZKey Ok!
```

**20. Apply a random beacon**
```jsx
snarkjs zkey beacon circuit_0003.zkey circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
```
The `zkey beacon` command creates a `zkey` file with a contribution applied in the form of a random beacon.

We use it to apply a random beacon to the latest `zkey` after the final contribution has been made (this is necessary to generate a final `zkey` file and finalize phase 2 of the trusted setup).

**21. Verify the final `zkey`**
```jsx
snarkjs zkey verify circuit.r1cs pot14_final.ptau circuit_final.zkey
```
Before we go ahead and export the verification key as a json, we perform a final check and verify the final protocol transcript (`zkey`).

If everything checks out, you should see the following again:
```jsx
[INFO]  snarkJS: ZKey Ok!
```

**22. Export the verification key**

```jsx
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
```
We export the verification key from `circuit_final.zkey` into `verification_key.json`. Output will print this:
```jsx
[INFO]  snarkJS: EXPORT VERIFICATION KEY STARTED
[INFO]  snarkJS: > Detected protocol: groth16
[INFO]  snarkJS: EXPORT VERIFICATION KEY FINISHED
```

### Testing ZK Verification Key

**23. Create the proof**

```jsx
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
```
We create the proof. This command generates the files `proof.json` and `public.json`:

- `proof.json` contains the actual proof.
- `public.json` contains the values of the public inputs and output.

**23.1 Calculate the witness and generate the proof in one step**

```jsx
snarkjs groth16 fullprove input.json circuit_js/circuit.wasm circuit_final.zkey proof.json public.json
```

**24. Verify the proof**

```jsx
snarkjs groth16 verify verification_key.json public.json proof.json
```
We use this command to verify the proof, passing in the verification_key we exported earlier.

If all is well, you should see that OK has been outputted to your console. This signifies the proof is valid.
```jsx
[INFO]  snarkJS: OK!
```

## Prepare ZK Verification key to be used onchain
Cardano zk primitives only works with compressed data, that's why we need to compress all points (G1 and G2) from verification_key.json that are going to be include into the onchain circuit verification key: `vk_alpha_1, vk_beta_2, vk_gamma_2, vk_delta_2` and all points in `IC`.

### Compress G1 and G2 points
The followwing command will effectively compress all points in `verification_key.json` and return `compressed_verification_key.json`
```jsx
node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm compress_zk_verification_key.ts janus-wallet/verification_key.json compressed_verification_key.json
```

> **NOTICE**: command above assume it will be executed from `src/zkproof`

## Start HTTP API Server

Server will be running on port `3001` by default. You can modify it and provide the rest of required information by creating a `.env` with this structure:

```
PORT=3001

# Database Connection
DB_HOST="localhost"
DB_PORT="5432"
DB_USERNAME="janus"
DB_PASSWORD="123456"
DB_NAME="janus_wallet"

# Cardano Network
CARDANO_NETWORK=Preview

# Blockfrost API
BLOCKFROST_API_URL=https://cardano-preview.blockfrost.io/api/v0
BLOCKFROST_API_KEY=preview...

# wallet signer
WALLET_PRV_KEY="ed25519_sk..."

# wallet collateral
COLLATERAL_PRV_KEY="ed25519_sk..."
COLLATERAL_ADDRESS="addr_test..."
COLLATERAL_UTXO_TX_ID="TX_ID..."
COLLATERAL_UTXO_TX_INDEX="TX_INDEX..."
COLLATERAL_UTXO_TX_AMOUNT="TX_AMOUNT..."
```
You may noticed a couple of thinks needed from `.env`

### Database Connection
This project uses `postgres` to store all the data like: circuits, users, etc. By default if no connection is provided it'll try to connect to:
```
DB_HOST="localhost"
DB_PORT="5432"
DB_USERNAME="janus"
DB_PASSWORD="123456"
DB_NAME="janus_wallet"
```
Once the connection is configured run the migrations in order to generate the database schema:
```jsx
npm run migrate
```

### Blockfrost
- `BLOCKFROST_API_KEY`: By default this guide is using `Preview` but you can switch to any other network. This is your Blockfrost `project_id`.

### Collateral Provider
Since Janus Wallet is a smart contract wallet, transactions containing the wallet's address **must** include collaterals.

At this time, there isn't a real collateral provider available so you'll need to provide all the data bellow in order to act as your own collateral provider : 
- `COLLATERAL_PRV_KEY`: Private key controlling the address where the collateral amount is
- `COLLATERAL_ADDRESS`: Address holding the collateral amount is
- `COLLATERAL_UTXO_TX_ID`: Transaction hash where the collateral amount is
- `COLLATERAL_UTXO_TX_INDEX`: Transaction index where the collateral amount is
- `COLLATERAL_UTXO_TX_AMOUNT`: Amount of ada to be used as collateral

Once the `.env` is ready you can start the HTTP server with:
```
npm start
``` 


### Mint circuit
Compressed verification key `compressed_verification_key.json` is what needs to be used on all onchain validation. In order to make it available, we need to mint a token with that data.  Janus Wallet provides an HTTP endpoint just for that: 
```jsx
POST http://localhost:3001/circuits
{
    "token_name": "Circuit#000",
    "version": 0,
    "nonce": "some random value",
    "circuit": {
        "vk_alpha1": "8f944ea2be1d423e0c36e660f1ada1a7134635fa3465a5fcaef0acf1f0896999a75cadedf66d311cd0a6313c18ffafce",
        "vk_beta2": "81dfe06986c3f80e8297c1ebb297671e768da02d5bf34ad87b404aba89cc1655f024e28942c7a1169139e6ce5ecacfde081e9ba17708034ca12593f19c020c2544e49aaff91a718f0199d1c35ae00b0f5f8101028d4ab9e804bf35a7f3eea524",
        "vk_gamma2": "93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
        "vk_delta2": "84bf191b52b37245585ff46a89b0b7489050c06f305c76ff3f091400f055782e07c549300ab623ac239f253276aa3a860d6f734f51e36c68aaceaf9278cd8f69d7737ec862effa5442ad75fb328e471811b43bae6ac6ca27f52fdc358df81a56",
        "vk_ic": [
            "b96ea33f7e293ee46e2a5298bfc29547175296e94001cd3a6b4da298bf1103ea2ff66053a9d1e7eb7183709dbadefd8e",
            "90daa46fc04d5e71ff4c4abd1f71e042cb60f3a0a4884d1c13aec3401cf6e4723f3e4b11b7e5a8548777447a4f66d55d",
            "b38187f1fc1fe0f5769846a05a96b99c06de97a99aa25c00066b9c4fbe948ff93866b11b0424ab497277da64aed53ad9",
            "b7caa8872d7c82bad8e14797f6aaae278911fc2b5ecd69e71fa8762ad9d525197630b43ab5ba06eb1739548e0e83800b",
            "85c7f52cf0ca708c389d07a01c30565679588362431b2787ab6c22b47b58e4f31a318fc2cdb9844b84c9de7a1fd09fc8"
        ]
    }
}
```
This endpoint will mint the token under a `policy_id` that will change according to `nonce`

### Create User
Next step is to registering a new user in the wallet via this endpoint:
```jsx
POST http://localhost:3001/wallets/{user_name}
{
    "hash": "16de4e0412334a7a78664ef6307117e601c9db5213b7ea96a1edf1d1fab543de" // 1234
}
```
This endpoint receive `user_name` and `hash`, since UI isn't itegrated yet you have to pass the password hash here manually but once UI is available the `hash` will be calculated in the user browser using a KDF (e.g `bcrypt`).

As a result a new token representing the user and a new address where all user's assets will be stored (this is the script address protected by zkproof) will be generated.
> **WARNING** Variable `user_name` **MUST** be URL encoded, e.g Fontus%23555 corresponding to username: Fontus#555

### Send Funds
Before you can send some funds user's wallet must hold some funds. You can go to [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) and send some test ADA to your wallet (to the address generated on the previous step). Once the funds are in your wallet use the follow this steps to send some funds:

**1. Build Spending Transaction**
```jsx
POST http://localhost:3001/wallets/{user_id}/build
{
    "amount": 5000000,
    "receive_address": "addr_test1qrjjmmg0j0evke5nz7n2axcnz6n3stj77s8ap3kexn8k9un7dkgzvzjqdqjdd4944eaz7j9768j83qw8u3rg6phlh7sqj9nww9"
}
```
Here we're sending 5 ADA to address: `addr_test1qrjjmmg0j0evke5nz7n2axcnz6n3stj77s8ap3kexn8k9un7dkgzvzjqdqjdd4944eaz7j9768j83qw8u3rg6phlh7sqj9nww9`. `user_id` is the id identifying the user, you get it on the the response creating the user. 

The response of this endpoint will be a transaction cbor that needs to be signed by the user:
```jsx
{ 
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```

**2. Sign Transaction**
```jsx
POST http://localhost:3001/wallets/{user_id}/sign
{
    "pwd": "1234",
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```
The `pwd` is the user password and `tx` is the one generated on previous step buidling the transaction.
> **NOTICE** Once the UI gets implemented this logic of this endpoint will be on user's borwser wallet so `pwd` never get exposed through the internet.

**3. Send Transaction**
```jsx
POST http://localhost:3001/wallets/{user_id}/send
{
     "redeemers": [
        "d8799f000000d8799fd8799f4a466f6e747573233030375820038d80332b588800df777dae9b4ad32f771e06bc807ae3be7d30e533f85f8c69582016de4e0412334a7a78664ef6307117e601c9db5213b7ea96a1edf1d1fab543deffffd8799fd8799f5830a6faef32ca4e678a7123d69fcb037e2eaaa3659dd85d9a104ce23c223b0e45f7ae4c265437db79f022fab79a451ce1865f5840a6c9595dd1f94975ac003b7293dbd5534b15d3b9f90ba07eea8c28d73c974fbeaa2428e83cad118359ec645459b3e5510b9bc2dc70d7690f1b8ed27290637a9c582080563114f3fb0aa891e47fae786b9319c69d8a9a6a46a8b85297deb699d39c16ff5830aff6aded475ffd2262039694b14dae39fae0d4ac41a7dbf6df1cb7955f6fdec3db3cf3601fbda058ed058728d8f92029ffffff",
        "d8799f010020d87a80d87a80ff"
    ],
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```
`redeemers` is an array containing the zk proof needed to validate against the circuit onchain, the rest of redeemers in the array are the one called ***bypass*** intended for transactions where there are more than one input from the wallet.

**4. Register and Delegate to Pool**
```jsx
POST http://localhost:3001/wallets/{user_id}/pools/{pool_id}/registerAndDelegate
{}
```
`pool_id` is the pool id in `bech32` format. The endpoint will register the certificate and delegate to the specified pool.

Response will look like the following:
```jsx
{ 
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```
In order to finally submit this transaction it must be signed (refer to Sign Transaction on step 2) and then be sent (refer to Send Transaction on step 3)

**5. Delegate to Pool**
```jsx
POST http://localhost:3001/wallets/{user_id}/pools/{pool_id}/delegate
{}
```
`pool_id` is the pool id in `bech32` format. The endpoint will delegate to the specified pool.

Response will look like the following:
```jsx
{ 
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```
In order to finally submit this transaction it must be signed (refer to Sign Transaction on step 2) and then be sent (refer to Send Transaction on step 3)

**6. Delegate to Delegate Representative (DRep)**
```jsx
POST http://localhost:3001/wallets/{user_id}/dreps/{drep_id}/delegate
{
     "drep_type": "Key"
}
```
Currently there are three types of delegation to a representative than can be made, especified by `drep_id`:
- **AlwaysAbstain**: `drep_type` is the same `AlwaysAbstain`
- **AlwaysNoConfidence**: `drep_type` is the same `AlwaysNoConfidence`
- **Specific Delegate Representative**: In this case `drep_id` is the delegate representative id hash in **hex format** and `drep_type` could be `Key` or `Script` depending on whether the hash belong to a pub/prv key or a script.

Similar to the other endpoints presented above it will return a tx that need to be signed and then sent using steps 2 and 3.
```jsx
{ 
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```

**7. Withdraw Rewards**
```jsx
POST http://localhost:3001/wallets/{user_id}/withdraw
{
    "amount": 1234567
}
```
This endpoint will withdraw the `amount` of rewards the user may have from have been delegating to stake pool/s.

Similar to the other endpoints presented above it will return a tx that need to be signed and then sent using steps 2 and 3.
```jsx
{ 
    "tx": "84a900828258205ae0ada6c3d2f461480b3d301b8444356c45fb6a09ebca32f49..."
}
```