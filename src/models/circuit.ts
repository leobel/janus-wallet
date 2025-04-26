import { MintUtxoRef } from "./mint-utxo-ref";
import { ZkVerificationKey } from "./zk-verification_key";

export interface Circuit {
    id: string;
    version: number;
    signer_key: string;
    nonce: string;
    policy_id: string;
    asset_name: string;
    mint_address: string;
    mint_utxo_ref: MintUtxoRef;
    mint_script: {
        type: string;
        script: string;
    };
    zk_verification_key: ZkVerificationKey;
    created_at: Date;
    updated_at: Date;
}