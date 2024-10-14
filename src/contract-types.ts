import { Data } from "@lucid-evolution/lucid";

const CredentialSchema = Data.Enum([
    Data.Object({ VerificationKeyCredential: Data.Tuple([Data.Bytes({ minLength: 28, maxLength: 28 })]) }),
    Data.Object({ ScriptCredential: Data.Tuple([Data.Bytes({ minLength: 28, maxLength: 28 })]) }),
]);
// export type Credential = Data.Static<typeof CredentialSchema>;
// export const Credential = CredentialSchema as unknown as Credential;

const MintSchema = Data.Object({
    nonce: Data.Bytes()
});

export type Mint = Data.Static<typeof MintSchema>;
export const Mint = MintSchema as unknown as Mint;