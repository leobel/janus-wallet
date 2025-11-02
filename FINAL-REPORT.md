# REPORT-FINAL

## Project: Janus zk-wallet — Final Close-out Report

### Executive Summary

This final report summarizes the Janus zk-wallet project from concept through mainnet deployment. The project delivered a password-based zero-knowledge wallet for the Cardano ecosystem that removes the need for seed phrases by using zk-SNARKs (Groth16) and on-chain verification. The wallet is live on Cardano mainnet and provides core wallet features, staking integration, and a password-change flow supported by generating new proofs and verification keys.

### Milestone Outputs

* **Functional wallet deployed on Cardano mainnet** (production-ready web application).
* **Final Project Close-out Report** (this document).
* **Final Demonstration Video** showcasing wallet features and real user interactions.

### Achievements (high level)

* **Mainnet deployment:** The Janus zk-wallet is publicly available and operational on Cardano mainnet. The application exposes a browser-accessible interface that performs all required flows without traditional seed-phrase management.
* **Core features implemented and tested:** Wallet creation, send/receive transactions, stake key registration and delegation, stake reward withdrawal, and password change/update flows.
* **Documentation and public transparency:** Full project documentation and progressive milestone reports (REPORT-M1, REPORT-M2, REPORT-M3) were published in the public repository.
* **User testing and iteration:** The prototype testing rounds informed UI and UX improvements; actionable feedback was incorporated and validated through non-breaking updates.

### Core Functionalities (technical checklist)

The wallet implements and demonstrates the following functionalities on Cardano mainnet:

* **Wallet creation** — password-based account creation, tied to an on-chain identity (NFT/UTxO pattern).
* **Send/receive transactions** — building and submitting transactions that spend UTxOs associated with the zk-enabled wallet address; ZK proofs used to authenticate user actions.
* **Register & delegate to stake pool** — stake key registration and delegation flows integrated with the wallet UI.
* **Withdraw staking rewards** — retrieval of staking rewards through confirmed ZK-authenticated transactions.
* **Change/update password** — secure password update flow that generates a new proof and updates verification parameters while preserving account continuity where applicable.

### Technical Summary

* **ZK protocol selection:** Groth16 zk-SNARKs on the BLS12-381 curve were chosen for succinct proof size and fast verification, aligning with Cardano’s cryptographic environment. This allows compact proofs and efficient on-chain verification for wallet actions.
* **Trusted setup:** A one-time trusted-setup (MPC/ceremony recommended) is required for Groth16. Mitigation strategies and best practices were followed during parameter generation.
* **On-chain pattern:** The wallet architecture leverages UTxO-based identity storage (minted NFTs or dedicated UTxOs) and on-chain proof verification for user actions.
* **Security considerations:** Attention was given to circuit correctness, cryptographic primitives implementation, and contract-level safety (validation of cross-chain communication and proof verification). Regression testing and audits were performed on critical code paths.

### User Testing & Feedback

* **Prototype testing rounds:** Multiple rounds of user testing (including an initial prototype round with 12 participants) provided actionable feedback across wallet creation, transaction UX, delegation flows, and password update flows. Issues such as confusing circuit-generation steps, input formatting errors, and terminology clarity were addressed.
* **Improvements implemented:** UI improvements (spinners and clearer progress indicators during proof generation), input validation, enhanced password-update UX (showing old vs new wallet addresses), and explanatory tooltips and documentation about delegation and CHANG rules were added.

### Challenges and How They Were Addressed

* **Circuit design complexity:** Circuit design is error-prone; robust unit testing for circuits and manual audits were incorporated to reduce risk.
* **Cryptographic implementation risks:** Careful selection of libraries, code reviews, and test vectors were used to validate primitive implementations.
* **On-chain resource constraints:** Groth16’s succinct proofs were selected to minimize on-chain cost; transactions were optimized to keep sizes and fees reasonable.

### Deployment & Evidence of Completion

**Live wallet:** [https://januswallet.xyz/](https://januswallet.xyz/)

**Repository and documentation:** [https://github.com/leobel/janus-wallet](https://github.com/leobel/janus-wallet)

**Progress milestone reports:**

* REPORT-M1.md (background on ZK, protocol selection and early technical notes)
* REPORT-M2.md (intermediate progress and testing notes)
* REPORT-M3.md (prototype user testing and updates)
* FINAL-REPORT.md (this report)

### Acceptance Criteria — Status

1. **Wallet application publicly available and operational on Cardano mainnet** (live mainnet URL provided).
2. **Wallet supports creation, send/receive, register & delegate, withdraw rewards, and password updates** — *Met* (features implemented and tested).
3. **Final close-out report publicly available** (this document and repository entries).
4. **Final close-out video publicly available** [Youtube video](https://youtu.be/sUqTIeuMycA) exploring Janus Wallet main features.
