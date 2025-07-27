## Table of Contents

- [Obtaining a ZK-SNARK circuit (GROTH16)](#obtaining-a-zk-snark-circuit-groth16)
   - [Prepare the project](#prepare-the-project)
   - [Locally using `snarkjs` and `circom` commands:](#locally-using-snarkjs-and-circom-commands)
   - [Phase 1 Trusted Setup](#phase-1-trusted-setup)
   - [Phase 2 Trusted Setup](#phase-2-trusted-setup)
   - [Testing ZK Verification Key](#testing-zk-verification-key)
   - [Prepare ZK Verification Key to be used onchain](#prepare-zk-verification-key-to-be-used-onchain)
   - [Compress G1 & G2 points](#compress-g1-and-g2-points)
- [Start API Server](#start-http-api-server)
   - [DB Connection](#database-connection)
   - [Blockfrost](#blockfrost)
   - [Collateral Provider](#collateral-provider)
- [Use API Endpoint](#use-api-endpoints)
   - [Mint ZK Circuit](#mint-circuit)
   - [Create User Account](#create-user)
   - [Send Funds](#send-funds)
   - [Register & Delegate to Pool](#register-and-delegate-to-pool)
   - [Delegate to Pool](#delegate-to-pool)
   - [Delegate to DRep](#delegate-to-delegate-representative-drep)
   - [Withdraw Rewards](#withdraw-rewards)
- [User Guide](#user-guide)
   - [Wallet Creation](#wallet-creation)
   - [Receive Funds](#receive-funds)
   - [Send Funds](#send-funds)
   - [Delegate to Stake Pool](#delegate-to-stake-pool)
   - [Delegate to DRep](#delegate-to-drep)
   - [Withdraw Rewards](#withdraw-rewards)
   - [Change Password](#change-password)
- [Tests](#test)



# Janus Wallet

Simplified Cardano Onboarding with ZK Proofs

# Obtaining a ZK-SNARK circuit (GROTH16)

## Prepare the project
let's just start installing all dependencies with:
```jsx
npm install
```

## Locally using `snarkjs` and `circom` commands:
First install `snarkjs` globally following installation guide [here](https://github.com/iden3/snarkjs?tab=readme-ov-file#install-node). To install circom, follow the instructions at [installing circom](https://docs.circom.io/getting-started/installation).

Once `snarkjs` is installed we can proceed to generate the ZK Verification keys as follow:

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
    signal input credentialHash; // Public credential hash, e.g Poseidon(pwd, userId)
    signal input challenge; // Public challenge the SC will require to match (this value will change on each successful tx so you can't use same proof twice)
    signal input challengeFlag; // Public flag indicating whether challenge overflow or not
    signal input circuitHash; // Public circuit hash, e.g Poseidon(pwd, hash, userId, challenge, challengeFlag)
    signal input pwd;  // Private user password

    // Step 1: Hash the provided password
    component p = Poseidon(2);
    p.inputs[0] <== pwd;
    p.inputs[1] <== userId;

    // deugging (Optional)
    log("credential hash:", p.out);

    // Step 2: Ensure the provided password & userId matches the known credential hash
    credentialHash === p.out;


    // Step 3: Hash all signals 
    component poseidon = Poseidon(5);
    poseidon.inputs[0] <== pwd;
    poseidon.inputs[1] <== userId;
    poseidon.inputs[2] <== credentialHash;
    poseidon.inputs[3] <== challenge;
    poseidon.inputs[4] <== challengeFlag;

    // deugging (Optional)
    log("circuit hash:", poseidon.out);

    // Step 4: Ensure the provided signals plus password matches the circuit hash
    circuitHash === poseidon.out;
}

component main {public [userId, credentialHash, challenge, challengeFlag, circuitHash]} = Authenticate();
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
[INFO]  snarkJS: # of Wires: 1357
[INFO]  snarkJS: # of Constraints: 1352
[INFO]  snarkJS: # of Private Inputs: 1
[INFO]  snarkJS: # of Public Inputs: 5
[INFO]  snarkJS: # of Labels: 2126
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
    "credentialHash": "17469782945530594987388377835453341901430155623074104503315972326141136515159",
    "challenge": "17469782945530594987388377835453341901430155623074104503315972326141136515159",
    "challengeFlag": "1",
    "circuitHash": "24883872159189864133794802823127472657146334491119345834661566606314629978415",
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
[INFO]  snarkJS:   Vars (wires):   1357
[INFO]  snarkJS:   Outputs:        0
[INFO]  snarkJS:   Public Inputs:  5
[INFO]  snarkJS:   Private Inputs: 1
[INFO]  snarkJS:   Labels:         2126
[INFO]  snarkJS:   Constraints:    1352
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
node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm compress_zk_verification_key.ts janus-wallet/verification_key.json janus-wallet/compressed_verification_key.json
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

Once the `.env` is ready you can start the HTTP server with:
```
npm start
``` 

> **WARNING** Logic to sign transactions (producing the ZKProof) relies on `circom` to be installed, so make sure it's accesible from the console running the server. One simple check is running `circom --version` to check if it's available. Normally the binary will be isntalled at: `$HOME/.cargo/bin` if you can't access to it from the console you can consider moving it to a global path like: `/usr/local/bin`


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
        "vk_delta2": "910d1b3de24b56acded36e43285b5abf910def69fa6f945b0a423dde08579d67f902cb2953a4e7b5f6bc2b9d173ec48c16fdffab8bad9fb1700e35bc74ea24c6d72f1d717cae480612e71990734ace847aed7f6ff9de9d6efc85698b3095669c",
        "vk_ic": [
            "8d043ff56d286437f7783c5c9f7d9db2fc4678172f99454965f5085e17a9bd1f1613d14fffd8bcc826420946c35c925b",
            "86fa74a9049758feb0336041daf0feb5f1d892ed563baac600ccf37e2ae7319b68070293a39b992e547bd264ca55bb48",
            "90c9f2c17f3ca057bb78858da0a800bf5dd7ce60c38efa8db74a1abbc3eac9325448dff74e05ead6f04897982076a798",
            "8ecfbfd2e8f23c4116d078da1806abcab8c4abe3af53c850e7b77a4a5fe27cae9db82e3de02bcd665c26946b0a38d035",
            "a6df181d334c56b40aa234d5d460ddac333c18bb10574346ed11416e42b7af1d29ac77deaa02e0baf203624e384a27bd",
            "83e9fd82457045e4ec2ee99837707c234ecbf106344148819b4c19ef1559a639b1a78faa39e2af44f73352f555855177"
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
    "hash": "42b79954029d65f3a460a8b1eb713af99a615413d5812bab025dd3396ffc0e09", // poseidon.hash(supersecret, Fontus#020)
    "kdf_hash": "243262243130246c7937437063726c42786e777977416b5a34494e444f4e6c782f634e4c327065627964523735452e376639522e6b32476c7931734f" // bcrypt.hash(supersecret, $2b$10$ly7CpcrlBxnwywAkZ4INDO)
}
```
This endpoint receive `user_name`, `hash` and `kdf_hash`, since UI isn't itegrated yet you have to pass both the credential hash (`poseidon.hash(supersecret, Fontus#020)`) and kdf hash (`bcrypt.hash(supersecret, $2b$10$ly7CpcrlBxnwywAkZ4INDO)`) here manually but once UI is available the `hash` will be calculated in the user browser using a KDF (e.g `bcrypt`).

To generate `hash` you can go to `src/zkproof` and run script `pwd_hash_credential.ts`:
```jsx
node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm pwd_hash_credential.ts -p supersecret -u Fontus#555
```
`pwd_hash_credential.ts` parameters are:
- `-p` user password
- `-u` user anme
It'll calculate the hash corresponing to `poseido.hash(pwd, username)`

To generate `kdf_hash` you can go to `src/zkproof` and run script `pwd_hash_bcrypt.ts` (we're using `bcrypt` under the hood):
```jsx
node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm pwd_hash_bcrypt.ts
``` 

`pwd_hash_bcrypt.ts` parameters are:
- `-p` user password
- `-s` (optional) random salt (this is usefull for testing porpuses but for production BETTER to leave `bcrypt` to generate a random salt)

As a result a new token representing the user and a new address where all user's assets will be stored (this is the script address protected by zkproof) will be generated.
> **WARNING** Variable `user_name` **MUST** be URL encoded, e.g Fontus%23555 corresponding to username: Fontus#555.

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

### Register and Delegate to Pool
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

### Delegate to Pool
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

### Delegate to Delegate Representative (DRep)
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

### Withdraw Rewards
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

# User Guide

## Wallet Creation

Creating a wallet is the first step to using the application. This wallet is built on zero-knowledge proofs (zk-SNARKs) and interacts with a smart contract on Cardano.
> ⚠️ NOTE: you must have a wallet in preprod with enough funds to cover the minting of your user profile NFT

### Steps to Create a Wallet

1. **Navigate to the Signup Page**
   - Visit the application’s homepage.
   - Click on **"Sign Up"** button.

2. **Choose a Username and Password**
   - Enter a **unique username**.
   - Choose a strong password. This password is used to generate a zk-SNARK proof for authentication.

   > ⚠️ If the username already exists, you’ll see an error message prompting you to choose a different one.

3. **Wallet Creation Behind the Scenes**
   - Upon submission, the application:
     - Deploys a smart contract with a UTxO holding your funds and address.
     - Mint and send an NFT to your wallet address representing your user profile

4. **Redirect to Dashboard**
   - After successful wallet creation, you'll be redirected to the **Dashboard**. No additional confirmation or email is required.

### Visual Walkthrough

*Enter your username and password.*
<img width="1718" height="987" alt="Screenshot 2025-07-26 at 6 14 49 PM" src="https://github.com/user-attachments/assets/1009c859-d885-4b66-aecf-15cabe7eacd7" />

*You will be redirected to the dashboard after a successful signup.*


### Wallet Overview

Once on the dashboard, you’ll see:

- **Wallet Address**: The address of your smart contract wallet.
- **Balance**: Real-time ADA balance fetched from the blockchain.
- **Navigation Menu**: A sidebar on the left lets you access:
  - Send
  - Receive
  - Delegate
  - Withdraw
  - Settings

*Main dashboard layout with left navigation sidebar.*
<img width="1726" height="991" alt="Screenshot 2025-07-26 at 6 18 19 PM" src="https://github.com/user-attachments/assets/119c0e85-5d5f-40f6-8c1e-82a478859616" />

### Receive Funds
Click on **Receive** navigation item to see your address. You can copy or provide the QR code to the sender.
<img width="1724" height="992" alt="Screenshot 2025-07-26 at 12 38 22 PM" src="https://github.com/user-attachments/assets/ae1349f8-ea1a-4b3b-b2d9-2eb80a50e277" />

### Send Funds
Click on **Send** navigation item to send funds to someone. Once there you can input: Recipient, Amount, Assets (not working yet). After that you'll be presented with the final fees to confirm. When confirm a model will prompt asking you to sing the transaction, *use the same password you enter when signup*. After tranasction is signed you'll see the progress until the transaction is successful and finally the transaction id will be shown so you can check it on-chain. 

*Sign your transaction*
<img width="1725" height="990" alt="Screenshot 2025-07-26 at 12 43 09 PM" src="https://github.com/user-attachments/assets/572c3a2c-927b-4281-9a6e-2aefc24010bf" />

*Transaction successful*
<img width="1726" height="992" alt="Screenshot 2025-07-26 at 12 40 20 PM" src="https://github.com/user-attachments/assets/d0423f3a-21c4-4d0d-b8c0-a3b757d2d5f9" />

### Delegate to Stake Pool
Click on **Earning** to select a pool to delegate. If you're delegating already information about current state like: what pool, rewards etc will be shown.

*current delegation status*
<img width="1726" height="991" alt="Screenshot 2025-07-26 at 5 27 26 PM" src="https://github.com/user-attachments/assets/82c23705-7968-4148-9826-4cd14086b127" />

Select a pool from the list and click on **STAKE**.

*List of pools* 
<img width="1725" height="990" alt="Screenshot 2025-07-26 at 12 44 26 PM" src="https://github.com/user-attachments/assets/b849dfe1-e6d3-4331-9f78-c4b77f598d56" />

After that you'll see delgation details to confirm. Same as with sending funds, you'll be prompted to sing the transaction.

*Delegation details*
<img width="1726" height="989" alt="Screenshot 2025-07-26 at 12 44 42 PM" src="https://github.com/user-attachments/assets/8800389e-c72d-40c8-ac2e-8ac6221d57a7" />

Upon success a transaction id will be shown so you can check it on-chain.

*Delegation successful*
<img width="1728" height="988" alt="Screenshot 2025-07-26 at 6 41 42 PM" src="https://github.com/user-attachments/assets/b7da273b-a923-4f5c-9fe4-81e71bc8ff47" />


### Delegate to DRep
Delegating to a representative (DRep) is needed not just to participate in Cardano's governance system but to be able to withdraw your stake pool rewards as a delegator. You can find the list of DReps under "Governance / Dreps" on the side bar menu. In case you've already delegated to a DRep you'll see the details of your current delegation like: Voting Power, DRep Id (along with a link to verify on-chain) and actions to change your status.
<img width="1726" height="992" alt="Screenshot 2025-07-27 at 5 16 17 PM" src="https://github.com/user-attachments/assets/b5437d83-6a05-48d2-aa2b-052811410f81" />

From the DRep list you can choose one to delegate by click on "DELEGATE" button. A dialog will show up displaying some information about the DRep selected as well as your voting power, drep id and fees for delegating.

### Withdraw Rewards
To withdraw your rewards go to **Earning** section and click on "WITHDRAW" button. A confirmation dialog will prompt shwowing the entire amount to withdraw along with the fees you'll incur.
> ⚠️ "WITHDRAW" button will only appear if there are rewards ready to be withdrawn (e.g after staking period had passed and pool had minted blocks).
<img width="1725" height="989" alt="Screenshot 2025-07-27 at 5 03 32 PM" src="https://github.com/user-attachments/assets/47d24474-06a6-4534-8ec5-f39680ee241c" />


### Change Password
This is one of the most critical actions inside Janus Wallet since it carry some irreversible changes. If you decide to update your password you should go to the footer on the sidebar menu click on the 3 vertical dots icon and then on settings which will navigate you to the settings page.
<img width="1726" height="993" alt="Screenshot 2025-07-27 at 5 22 19 PM" src="https://github.com/user-attachments/assets/0d82a027-2c5a-41e4-a3e3-0a9d11daf981" />

On the settings page you'll see a *Danger Zone* section at the bottom. There is a buttom there to effectively change your passoword.
> ⚠️ Make sure to read carefully all the information provided on that section since all funds received the old address once you've changed your password will be lost (can't be recovered).
<img width="1727" height="992" alt="Screenshot 2025-07-27 at 5 27 33 PM" src="https://github.com/user-attachments/assets/b62236aa-6d57-4d18-99a5-39df6b89b1d4" />


The process will ask you for your new password and confirmation to send the transaction(s) to change the password. 
> NOTE: There could be more than one transaction in the case of a wallet having too many UTxOs causing to split the process into multiple transactions to transfer all funds to the new address
<img width="1725" height="986" alt="Screenshot 2025-07-26 at 3 20 33 PM" src="https://github.com/user-attachments/assets/d25cf78a-6efd-4ce6-8047-2887548ad5f3" />

After all transactions succeed, you'll be logout so you can login again with the new password.

## Test
```jsx
aiken check -t silent .
Compiling tangocrypto/janus-wallet 0.0.0 (.)
    Compiling aiken-lang/stdlib v2.1.0 (./build/packages/aiken-lang-stdlib)
      Testing ...

    ┍━ tests/challenge ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │ PASS [mem: 208949, cpu:  117098579] build_challenge_ok
    │ PASS [mem: 207283, cpu:  114000813] build_challenge_ok_1
    ┕━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2 tests | 2 passed | 0 failed

    ┍━ tests/mint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │ PASS [mem: 146551, cpu:   44767225] mint_account_ok
    │ PASS [mem: 127471, cpu:   38992815] mint_account_invalid_datum
    │ · with traces
    │ | failed to deserialise PlutusData using UnConstrData
    │         Value Con(
    │                   Data(
    │                       BoundedBytes(
    │                           BoundedBytes(
    │                               [],
    │                           ),
    │                       ),
    │                   ),
    │               )
    │ PASS [mem: 146551, cpu:   44762199] mint_account_different_user_id
    │ PASS [mem: 127278, cpu:   39670696] mint_account_send_to_same_script
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem: 132147, cpu:   40019076] mint_account_send_to_pub_prv_key
    │ PASS [mem: 174258, cpu:   50991106] mint_circuit_ok
    │ PASS [mem:  84886, cpu:   24995578] mint_circuit_invalid_no_signed
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem: 127920, cpu:   39964052] mint_circuit_invalid_datum
    │ · with traces
    │ | failed to deserialise PlutusData using UnConstrData
    │         Value Con(
    │                   Data(
    │                       BoundedBytes(
    │                           BoundedBytes(
    │                               [],
    │                           ),
    │                       ),
    │                   ),
    │               )
    │ PASS [mem: 127566, cpu:   38981813] mint_circuit_send_to_different_script
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem: 136836, cpu:   40110242] mint_circuit_send_to_pub_prv_script
    ┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10 tests | 10 passed | 0 failed

    ┍━ tests/spend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │ PASS [mem: 687195, cpu: 2871498366] spend_evaluating_real_script
    │ PASS [mem: 688597, cpu: 2871874464] spend_evaluating_script
    │ PASS [mem: 253523, cpu:   75494440] spend_evaluating_bypass
    │ PASS [mem: 190310, cpu:   54432950] spend_evaluating_wrong_self_ref
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem: 190692, cpu:   54921654] spend_evaluating_no_script
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem: 190314, cpu:   54793472] spend_evaluating_wrong_target
    │ · with traces
    │ | the validator crashed / exited prematurely
    ┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6 tests | 6 passed | 0 failed

    ┍━ tests/verify ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │ PASS [mem: 176202, cpu:   91543356] verify_challenge_certs
    │ PASS [mem:  89791, cpu: 2541340679] verify_zk_proof
    │ PASS [mem:  89791, cpu: 2541340679] verify_zk_proof_1
    │ PASS [mem:  63964, cpu: 1355803465] verify_zk_proof_invalid_user
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem:  63964, cpu: 1355812874] verify_zk_proof_invalid_circuit_hash
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem:  63964, cpu: 1355812874] verify_zk_proof_invalid_challenge
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem:  63964, cpu: 1355812874] verify_zk_proof_invalid_overflow
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem:  63964, cpu: 1355812874] verify_zk_proof_invalid_proof
    │ · with traces
    │ | the validator crashed / exited prematurely
    │ PASS [mem:  19672, cpu:    6533232] verify_zk_proof_overflow_one
    │ PASS [mem:  17165, cpu:    7145501] verify_zk_proof_overflow_zero
    │ PASS [mem:  89791, cpu: 2541359497] verify_zk_proof_performance
    ┕━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 11 tests | 11 passed | 0 failed
...
Summary 29 checks, 0 errors, 19 warnings
```



