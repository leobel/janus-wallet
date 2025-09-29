import { Blockfrost, Data, fromText, Lucid } from "@lucid-evolution/lucid";
// import { readValidators } from "./prepare-contracts";
import { generateMintPolicy, readValidators } from "./utils/prepare-contracts"
import * as fs from 'fs';
import { ZkDatum, ZkVerificationKey } from "./contract-types";
import { MintRedeemer } from "./utils/contract-types";

const lucid = await Lucid(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "preview1OQSKlQ6tb3WYBx9bqlz7kDFhuglmfvL"
    ),
    "Preview"
);
const prvKey = fs.readFileSync('./src/me.sk').toString();
lucid.selectWallet.fromPrivateKey(prvKey);
const walletAddress = await lucid.wallet().address();

const validators = readValidators();
const nonce = "9565b074c5c930aff80cac59a2278b70";
const version = 0
const { mint, policyId, mintAddress } = generateMintPolicy("Preview", validators.mint.script, walletAddress, version, nonce);

console.log('PolicyId:', policyId);
console.log("Mint Address:", mintAddress)
console.log('Mint Script:', mint);

const lovelace = 1_000_000;
const tokenName = fromText('Circuit#000');
console.log('Token Name:', tokenName);

const assetName = `${policyId}${tokenName}`;

// User Id
const userId = BigInt(`0x${tokenName}`);
console.log('User Id:', userId);

// ZK Verification Key
const zkey: ZkVerificationKey = {
    vk_alpha1: "b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
    vk_beta2: "845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
    vk_gamma2: "93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
    vk_delta2: "a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
    vk_ic: [
        "ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        "a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        "a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        "a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        "93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        "b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        "a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
    ],
};

const data: ZkDatum = {
    userId: tokenName,
    hash: BigInt("10343661163184219313272354919635983875711247223011266158462328948931637363678").toString(16),
    zkey
};

const datum = Data.to(data, ZkDatum);
console.log('Datum', datum);

const _mintRedeemer: MintRedeemer = "CreateCircuit";
const mintRedeemer = Data.to(_mintRedeemer, MintRedeemer);
console.log('Redeemer:', mintRedeemer);
console.log("Wallet Address:", walletAddress)

const validTo = Date.now() + (22 * 60 * 60 * 1000); // 22 hour
const _tx = lucid
    .newTx()
    // use the mint validator
    .attach.MintingPolicy(mint)
    // mint 1 of the asset
    .mintAssets(
        { [assetName]: BigInt(1) },
        // this redeemer is the first argument
        mintRedeemer
    )
    .pay.ToContract(
        mintAddress,
        {
            kind: "inline",
            value: datum,
        },
        {
            lovelace: BigInt(lovelace),
            [assetName]: BigInt(1)
        }
    )
    .validTo(validTo);

let tx = await _tx.complete({ localUPLCEval: true});
const txSigned = await tx.sign.withWallet().complete();
// console.log('cbor', await tx.toString());
console.log('cbor', txSigned.toCBOR({ canonical: false }));
console.log('cbor (canonical)', txSigned.toCBOR({ canonical: true }));
console.log('Tx Id:', txSigned.toHash());

// const txHash = await txSigned.submit();
// console.log('Tx Id (Submit):', txHash);
// const success = await lucid.awaitTx(txHash);
// console.log('Success?', success);