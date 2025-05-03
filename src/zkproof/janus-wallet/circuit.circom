pragma circom 2.1.6;

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

/* INPUT = {
    "userId": "52435875175126190479447740508185965837690552500527637822603658699938581184512",
    "credentialHash": "17469782945530594987388377835453341901430155623074104503315972326141136515159",
    "challenge": "17469782945530594987388377835453341901430155623074104503315972326141136515159",
    "challengeFlag": "1",
    "circuitHash": "24883872159189864133794802823127472657146334491119345834661566606314629978415",
    "pwd": "52435875175126190479447740508185965837690552500527637822603658699938581184512"
} */