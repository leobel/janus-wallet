pragma circom 2.1.6;

include "circomlib/poseidon.circom";

//include "../node_modules/circomlib/circuits/poseidon.circom";
// include "https://github.com/0xPARC/circom-secp256k1/blob/master/circuits/bigint.circom";

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

// biggest possible inputs

/* INPUT = {
    "userId": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challenge": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "challengeFlag": "1",
    "hash": "7507823236105502751361814670776963121972651270405097442444326619292614813323",
    "pwd": "52435875175126190479447740508185965837690552500527637822603658699938581184512"
} */