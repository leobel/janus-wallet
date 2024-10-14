import { applyDoubleCborEncoding, applyParamsToScript, Data, MintingPolicy, Network, SpendingValidator, Credential, validatorToAddress, validatorToScriptHash, Blockfrost, Lucid, getAddressDetails } from "@lucid-evolution/lucid";
import blueprint from "../plutus.json" assert { type: 'json' };
import { Mint } from "./contract-types";
import * as fs from 'fs';

export type Validators = {
    spend: SpendingValidator;
    mint: MintingPolicy;
};

export type AppliedValidators = {
    mint: MintingPolicy;
    spend: SpendingValidator;
    policyId: string;
    spendAddress: string;
};

export function randomNonce(s = 32): string {
    if (s % 2 == 1) {
        throw new Error("Only even sizes are supported");
    }
    const buf = new Uint8Array(s / 2);
    crypto.getRandomValues(buf);
    let nonce = "";
    for (let i = 0; i < buf.length; ++i) {
        nonce += ("0" + buf[i].toString(16)).slice(-2);
    }
    console.log('Nonce:', nonce);
    return nonce;
}

export function readValidators(): Validators {
    const spend = blueprint.validators.find((v) => v.title === "janus.account.spend");

    if (!spend) {
        throw new Error("Spend validator not found");
    }

    const mint = blueprint.validators.find((v) => v.title === "janus.wallet.mint");

    if (!mint) {
        throw new Error("Mint validator not found");
    }

    return {
        spend: {
            type: "PlutusV3",
            script: spend.compiledCode,
        },
        mint: {
            type: "PlutusV3",
            script: mint.compiledCode,
        },
    };
}

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
const walletPaymentHash = getAddressDetails(walletAddress).paymentCredential!.hash;
const walletStakeHash = getAddressDetails(walletAddress).stakeCredential?.hash;

export function applyParams(
    mint_script: string,
    spend_script: string,
    // policy: Policy,
    // credential: Credential,
    network: Network,
    nonce?: string
): AppliedValidators {
    const keyCredential: Credential = { 
        type: "Key",
        hash: walletPaymentHash
    };

    const spend: SpendingValidator = {
        type: "PlutusV3",
        script: applyDoubleCborEncoding(spend_script)
    };
    const spendAddress = validatorToAddress(network, spend);
    const spendAddress1 = validatorToAddress(network, spend, keyCredential);
    const scriptHash = validatorToScriptHash(spend);
    console.log('Spend script hash:', scriptHash);
    console.log('Script address (with wallet stake credential):', spendAddress1);

    // const credential: Credential = { ScriptCredential: [scriptHash] };


    

    const params = Data.to({
        nonce: nonce || randomNonce()
    }, Mint);
    console.log('Mint params:', params);
    const mintParams = Data.from(params);
    console.log('Mint params:', mintParams.toString());
    console.log('Mint params:', Data.to(mintParams));
    


    const mint: MintingPolicy = {
        type: "PlutusV3",
        script: applyParamsToScript(applyDoubleCborEncoding(mint_script),
            [
                mintParams
            ],
        )
    };

    const policyId = validatorToScriptHash(mint);

    return {
        mint,
        spend,
        policyId,
        spendAddress
    };
}


const validators = readValidators();
const nonce = "9565b074c5c930aff80cac59a2278b70";
const { mint, policyId, spendAddress } = applyParams(validators.mint.script, validators.spend.script, "Preview", nonce);
console.log('PolicyId:', policyId);
console.log('Spend Script Address:', spendAddress);
console.log('Mint Script:', mint);
