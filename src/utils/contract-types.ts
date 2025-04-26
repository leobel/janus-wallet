import { Data } from "@lucid-evolution/lucid";

const HashBlake2b224Schema = Data.Bytes({ minLength: 28, maxLength: 28 });
const HashBlake2b256Schema = Data.Bytes({ minLength: 32, maxLength: 32 });
const DataHashSchema = HashBlake2b256Schema;
const StakePoolIdSchema = HashBlake2b224Schema;

const PolicyIdSchema = Data.Bytes({ minLength: 0, maxLength: 28 });;
export type PolicyId = Data.Static<typeof PolicyIdSchema>;
export const PolicyId = PolicyIdSchema as unknown as PolicyId;

const AssetNameSchema = Data.Bytes({ minLength: 0, maxLength: 32 });
export type AssetName = Data.Static<typeof AssetNameSchema>;
export const AssetName = AssetNameSchema as unknown as AssetName;

const PointerSchema = Data.Object({
    slot_number: Data.Integer(),
    transaction_index: Data.Integer(),
    certificate_index: Data.Integer()
});

const CredentialSchema = Data.Enum([
    Data.Object({ VerificationKey: Data.Tuple([HashBlake2b224Schema]) }),
    Data.Object({ Script: Data.Tuple([HashBlake2b224Schema]) }),
]);
export type Credential = Data.Static<typeof CredentialSchema>;
export const Credential = CredentialSchema as unknown as Credential;

const StakeCredentialSchema = Data.Enum([
    Data.Object({ Inline: Data.Tuple([CredentialSchema], { hasConstr: true }) }),
    Data.Object({ Pointer: Data.Tuple([PointerSchema], { hasConstr: true }) })
])

// const StakeCredentialSchema = Data.Tuple([ReferencedSchema], { hasConstr: true });
export type StakeCredential = Data.Static<typeof StakeCredentialSchema>;
export const StakeCredential = StakeCredentialSchema as unknown as StakeCredential;

const MintSchema = Data.Object({
    version: Data.Integer(),
    owner: Data.Bytes(),
    nonce: Data.Bytes()
});
export type Mint = Data.Static<typeof MintSchema>;
export const Mint = MintSchema as unknown as Mint;

const MintRedeemerSchema = Data.Enum([
    Data.Literal("CreateCircuit"),
    Data.Literal("CreateAccount"),
    Data.Literal("BurnAccount"),
])
export type MintRedeemer = Data.Static<typeof MintRedeemerSchema>;
export const MintRedeemer = MintRedeemerSchema as unknown as MintRedeemer;

const AddressSchema = Data.Object({
    payment_credential: CredentialSchema,
    stake_credential: Data.Nullable(StakeCredentialSchema),
});
export type Address = Data.Static<typeof AddressSchema>;
export const Address = AddressSchema as unknown as Address;

const OutputReferenceSchema = Data.Object({
    transaction_id: HashBlake2b256Schema,
    output_index: Data.Integer()
});
export type OutputReference = Data.Static<typeof OutputReferenceSchema>;
export const OutputReference = OutputReferenceSchema as unknown as OutputReference;

const ValueSchema = Data.Map(PolicyIdSchema, Data.Map(AssetNameSchema, Data.Integer()));
export type Value = Data.Static<typeof ValueSchema>;
export const Value = ValueSchema as unknown as Value;

const DatumSchema = Data.Enum([
    Data.Object({ NoDatum: Data.Literal("NoDatum") }),
    Data.Object({ DatumHash: Data.Tuple([HashBlake2b256Schema], { hasConstr: true }) }),
    Data.Object({ InlineDatum: Data.Tuple([Data.Any()], { hasConstr: true }) }),
]);
export type Datum = Data.Static<typeof DatumSchema>;
export const Datum = DatumSchema as unknown as Datum;

const OutputSchema = Data.Object({
    address: AddressSchema,
    value: ValueSchema,
    datum: DatumSchema,
    reference_script: Data.Nullable(HashBlake2b224Schema)
});
export type Output = Data.Static<typeof OutputSchema>;
export const Output = OutputSchema as unknown as OutputReference;

const ChallengeOutputSchema = Data.Object({
    address: AddressSchema,
    value: Data.Bytes(),
    datum: Data.Bytes(),
    reference_script: Data.Nullable(HashBlake2b224Schema)
});
export type ChallengeOutput = Data.Static<typeof ChallengeOutputSchema>;
export const ChallengeOutput = ChallengeOutputSchema as unknown as ChallengeOutput;

const InputSchema = Data.Object({
    output_reference: OutputReferenceSchema,
    output: OutputSchema
});
export type Input = Data.Static<typeof InputSchema>;
export const Input = InputSchema as unknown as Input;

const ReferenceInputsSchema = Data.Array(InputSchema);
export type ReferenceInputs = Data.Static<typeof ReferenceInputsSchema>;
export const ReferenceInputs = ReferenceInputsSchema as unknown as ReferenceInputs;


const ZkVerificationKeySchema = Data.Object({
    vk_alpha1: Data.Bytes(),
    vk_beta2: Data.Bytes(),
    vk_gamma2: Data.Bytes(),
    vk_delta2: Data.Bytes(),
    vk_ic: Data.Array(Data.Bytes())
});
export type ZkVerificationKey = Data.Static<typeof ZkVerificationKeySchema>;
export const ZkVerificationKey = ZkVerificationKeySchema as unknown as ZkVerificationKey;

const AccountDatumSchema = Data.Object({
    user_id: Data.Bytes(),
    hash: Data.Bytes(),
    nonce: Data.Bytes(),
});
export type AccountDatum = Data.Static<typeof AccountDatumSchema>;
export const AccountDatum = AccountDatumSchema as unknown as AccountDatum;

const SpendSchema = Data.Object({
    policy_id: PolicyIdSchema,
    circuit_asset_name: AssetNameSchema,
    asset_name: AssetNameSchema,
    nonce: Data.Bytes(),
    for_evaluation: Data.Boolean()
});

export type Spend = Data.Static<typeof SpendSchema>;
export const Spend = SpendSchema as unknown as Spend;

const SignalsSchema = Data.Object({
    userId: Data.Bytes(),
    challenge: Data.Bytes(),
    hash: Data.Bytes(),
});


export type Signals = Data.Static<typeof SignalsSchema>;
export const Signals = SignalsSchema as unknown as Signals;

const ProofSchema = Data.Object({
    pA: Data.Bytes(),
    pB: Data.Bytes(),
    pC: Data.Bytes(),
});

export type Proof = Data.Static<typeof ProofSchema>;
export const Proof = ProofSchema as unknown as Proof;

const RedeemerSchema = Data.Object({
    self_idx: Data.Integer(),
    idx: Data.Integer(),
    jdx: Data.Integer(),
    signals: Data.Nullable(SignalsSchema),
    proof: Data.Nullable(ProofSchema)
});

export type Redeemer = Data.Static<typeof RedeemerSchema>;
export const Redeemer = RedeemerSchema as unknown as Redeemer;

const PublishRedeemerSchema = Data.Enum([
    Data.Literal("Register"),
    Data.Literal("RegisterAndDelegate"),
    Data.Literal("Delegate"),
]);
export type PublishRedeemer = Data.Static<typeof PublishRedeemerSchema>;
export const PublishRedeemer = PublishRedeemerSchema as unknown as PublishRedeemer;

const WithdrawRedeemerSchema = Data.Enum([
    Data.Literal("Withdraw"),
    Data.Literal("Fails"), // TODO: use only one literal
]);
export type WithdrawRedeemer = Data.Static<typeof WithdrawRedeemerSchema>;
export const WithdrawRedeemer = WithdrawRedeemerSchema as unknown as WithdrawRedeemer;

const NeverSchema = Data.Nullable(Data.Integer()); // always instantiate to null

const DelegateBlockProductionSchema = Data.Object({
    stake_pool: StakePoolIdSchema,
});
const DelegateRepresentativeSchema = Data.Enum([
    Data.Object({ Registered: CredentialSchema }),
    Data.Object({ AlwaysAbstain: Data.Literal("AlwaysAbstain") }),
    Data.Object({ AlwaysNoConfidence: Data.Literal("AlwaysNoConfidence") }),
]);
export type DelegateRepresentative = Data.Static<typeof DelegateRepresentativeSchema>;
export const DelegateRepresentative = DelegateRepresentativeSchema as unknown as DelegateRepresentative;

const DelegateVoteSchema = Data.Object({
    delegate_representative: DelegateRepresentativeSchema,
});
const DelegateBothSchema = Data.Object({
    stake_pool: StakePoolIdSchema,
    delegate_representative: DelegateRepresentativeSchema
});
const DelegateSchema = Data.Enum([
    Data.Object({ DelegateBlockProduction: DelegateBlockProductionSchema }),
    Data.Object({ DelegateVote: DelegateVoteSchema }),
    Data.Object({ DelegateBoth: DelegateBothSchema }),
]);

const RegisterCredentialSchema = Data.Object({
    credential: CredentialSchema,
    deposit: NeverSchema
});
const UnRegisterCredentialSchema = Data.Object({
    credential: CredentialSchema,
    refund: NeverSchema
});
const DelegateCredentialSchema = Data.Object({
    credential: CredentialSchema,
    delegate: DelegateSchema
});
const RegisterAndDelegateCredentialSchema = Data.Object({
    credential: CredentialSchema,
    delegate: DelegateSchema,
    deposit: Data.Integer(),
});
const RegisterDelegateRepresentativeSchema = Data.Object({
    delegate_representative: CredentialSchema,
    deposit: Data.Integer(),
});
const UpdateDelegateRepresentativeSchema = Data.Object({
    delegate_representative: CredentialSchema,
});
const UnregisterDelegateRepresentativeSchema = Data.Object({
    delegate_representative: CredentialSchema,
    refund: Data.Integer(),
});
const RegisterStakePoolSchema = Data.Object({
    stake_pool: StakePoolIdSchema,
    vrf: HashBlake2b224Schema
});
const RetireStakePoolSchema = Data.Object({
    stake_pool: StakePoolIdSchema,
    at_epoch: Data.Integer()
});
const AuthorizeConstitutionalCommitteeProxySchema = Data.Object({
    constitutional_committee_member: CredentialSchema,
    proxy: CredentialSchema,
});
const RetireFromConstitutionalCommitteeSchema = Data.Object({
    constitutional_committee_member: CredentialSchema
})

const CertificateSchema = Data.Enum([
    Data.Object({ RegisterCredential: RegisterCredentialSchema }),
    Data.Object({ UnRegisterCredential: UnRegisterCredentialSchema }),
    Data.Object({ DelegateCredential: DelegateCredentialSchema }),
    Data.Object({ RegisterAndDelegateCredential: RegisterAndDelegateCredentialSchema }),
    Data.Object({ RegisterDelegateRepresentative: RegisterDelegateRepresentativeSchema }),
    Data.Object({ UpdateDelegateRepresentative: UpdateDelegateRepresentativeSchema }),
    Data.Object({ UnregisterDelegateRepresentative: UnregisterDelegateRepresentativeSchema }),
    Data.Object({ RegisterStakePool: RegisterStakePoolSchema }),
    Data.Object({ RetireStakePool: RetireStakePoolSchema }),
    Data.Object({ AuthorizeConstitutionalCommitteeProxy: AuthorizeConstitutionalCommitteeProxySchema }),
    Data.Object({ RetireFromConstitutionalCommittee: RetireFromConstitutionalCommitteeSchema }),
]);
export type Certificate = Data.Static<typeof CertificateSchema>;
export const Certificate = CertificateSchema as unknown as Certificate;

const ChallengeSchema = Data.Object({
    reference_inputs: Data.Array(OutputReferenceSchema),
    inputs: Data.Array(OutputReferenceSchema),
    outputs: Data.Array(ChallengeOutputSchema),
    mint: Data.Bytes(),
    certificates: Data.Array(CertificateSchema),
});
export type Challenge = Data.Static<typeof ChallengeSchema>;
export const Challenge = ChallengeSchema as unknown as Challenge;

