import { applyDoubleCborEncoding, Blockfrost, CML, Data, fromText, getAddressDetails, Lucid, Maestro, UTxO } from "@lucid-evolution/lucid";
import { generateSpendScript, getSpendRedeemer, readValidators, getInput, serialiseReferenceInputs, serialiseBody, generateMintPolicy, spendTx, ZKProof, ZkInput, generatePublishValidator, registerAndDelegateTx, withdrawTx } from "./prepare-contracts";
import * as fs from 'fs';

// console.log("TX", CML.Transaction.from_cbor_hex("").to_json());

// console.log("TX", CML.Transaction.from_cbor_hex("").to_json());


const network = "Preview";
// const network = "Preprod";
const lucid = await Lucid(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "preview1OQSKlQ6tb3WYBx9bqlz7kDFhuglmfvL"
        // "https://cardano-preprod.blockfrost.io/api/v0",
        // "preprodNQK7GqWxfMkWg9x5j4bHOVBNNGpjmxQv"
    ),
    network
);
// const lucid = await Lucid(
//     new Maestro({
//         apiKey: "M4tGNWFPzrC35t3HW5LVEkcH8tvO0FkS",
//         network
//     }),
//     network
// );

const prvKey = fs.readFileSync('./src/me.sk').toString();
lucid.selectWallet.fromPrivateKey(prvKey);
const walletAddress = await lucid.wallet().address();

const policyId = "b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422";
const tokenName = fromText('Fontus#000');
console.log('Token Name:', tokenName);
const assetUnit = `${policyId}${tokenName}`;

const validators = readValidators();
const { publish: stake, rewardAddress } = generatePublishValidator(validators.publish.script, network, policyId, tokenName);
const { spend, spendAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName);
console.log('Spend Address:', spendAddress);
console.log('Reward Address:', rewardAddress);
// console.log('Spend Script:', spend);

const utxoRef: UTxO = {
    address: "addr_test1vq7uu7zy7d4j8wxrly90hfq25xyw0uwn7m52e5w4gnk3m2gprf2za",
    txHash: "d6da036c1aeb7680323258c763a2a6e25be9b280c2a8fedd5e43cb89730fdadf",
    outputIndex: 0,
    assets: { lovelace: 4_366_030n, [assetUnit]: 1n },
    datum: "d8799f4a466f6e74757323303030582016de4e0412334a7a78664ef6307117e601c9db5213b7ea96a1edf1d1fab543ded8799f5830b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e035f5840845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae15820a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54ff5f584093e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc510515820c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8ff5f5840a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da5582001e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15ff9f5830ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed4805830a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c35830a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad8545830a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12583093a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d78848935830b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d65830a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41ffffff"

}

const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour


// User Id (could be tokenName directly). All data passed to sc are hex representation 
const userId = BigInt(`0x${tokenName}`).toString(16);
console.log('User Id:', userId);
let hash = BigInt("10343661163184219313272354919635983875711247223011266158462328948931637363678").toString(16)
console.log('Wallet Address', walletAddress);

const utxo: UTxO = {
    address: spendAddress,
    txHash: "6d2490a7ae40e5795892415a4c1c01c5d4b9d9a632de7ef18fc0f7d931f783d9",
    outputIndex: 0,
    assets: { lovelace: BigInt(50_000_000) }
}

const zkInput: ZkInput = {
    userId: userId,
    hash: hash,
    pwd: "1234"
    // pwd: "12345"
}
const rewards = 0
+ 5594733   // 
+ 10273139  //
+ 11082554 // // 26_950_426
+ 11639990
+ 11875503
+ 10613611
+ 9117802
+ 11957962
+ 9143908

const amount = BigInt(rewards)

const poolId = "pool1p9xu88dzmpp5l8wmjd6f5xfs9z89mky6up86ty2wz4aavmm8f3m";

await withdrawTx(lucid, [utxoRef], [utxo], amount, rewardAddress, stake, spendAddress, spend, poolId, validTo, spendAddress, zkInput, policyId, tokenName, network, { localUPLCEval: true });