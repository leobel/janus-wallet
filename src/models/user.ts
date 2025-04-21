import { ZKVerificationRef } from "./zk-verification-ref";

export interface User {
    id: string;
    user_id: string;
    pwd_hash: string;
    wallet_address: string;
    zk_verification_ref: ZKVerificationRef;
    created_at: Date;
    updated_at: Date;
}