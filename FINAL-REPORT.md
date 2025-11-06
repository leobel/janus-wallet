# FINAL-REPORT

## Janus zk-wallet — Project Close-out Report

**Project name & URL on IdeaScale / Fund:**  
Janus Wallet: Simplified Cardano Onboarding with ZK Proof — https://projectcatalyst.io/funds/13/cardano-use-cases-concept/janus-wallet-simplified-cardano-onboarding-with-zk-proof

**Project Number:**  
#1300120

**Project Manager:**  
Leobel Izquierdo Alvarez

**Date project started:**  
February 2025

**Date project completed (close-out submission):**  
Project development and mainnet deployment completed July 2025; final close-out submission: November, 2025.

---

## 1. Short summary

This project implemented a password-based zk-enabled wallet for the Cardano ecosystem that removes the need for seed phrases by using succinct zero-knowledge proofs and on-chain verification. The application was developed across four milestones (research, smart contract integration, prototype, and close-out) and is publicly available as a production web dApp on Cardano mainnet.

Key outputs:
- Live Janus wallet (mainnet): https://januswallet.xyz/
- Preprod demo: https://preprod.januswallet.xyz/
- Repository & docs: https://github.com/leobel/janus-wallet
- Progressive milestone reports: [REPORT-M1](https://github.com/leobel/janus-wallet/blob/main/REPORT-M1.md), [REPORT-M2](https://github.com/leobel/janus-wallet/blob/main/REPORT-M2.md), [REPORT-M3](https://github.com/leobel/janus-wallet/blob/main/REPORT-M3.md)
- Final close-out video: https://www.youtube.com/watch?v=sUqTIeuMycA

---

## 2. List of challenge KPIs and how the project addressed them

**Challenge:** Cardano Use Cases — simplify onboarding & support programmable wallets

- **KPI:** Deliver a working password-based wallet prototype and progress it to mainnet.  
  **Status:** Met. A working prototype (preprod) was published, iterated with user feedback [REPORT-M3](https://github.com/leobel/janus-wallet/blob/main/REPORT-M3.md) and the final wallet is deployed to Cardano mainnet.

- **KPI:** Demonstrate on-chain wallet programmability and staking flows (register, delegate, withdraw).  
  **Status:** Met. The wallet supports stake key registration, delegation to a stake pool or DRep, and reward withdrawals through the ZK-enabled flow.

- **KPI:** Open-source release of core components.  
  **Status:** Met. The codebase and documentation are published under the GitHub repo and include README, ZK circuit notes, and milestone reports.

---

## 3. List of project KPIs and how the project addressed them

- **KPI:** Wallet creation flow implemented (password-based).  
  **Status:** Met. Password-based account creation implemented and tested on preprod and mainnet.

- **KPI:** Send/receive transactions supported and tested.  
  **Status:** Met. Frontend builds and submits transactions on-chain; flows are demonstrated in the prototype and final video.

- **KPI:** Staking flows (register/delegate/withdraw rewards).  
  **Status:** Met. Integrated delegation and rewards withdrawal flows verified during testing.

- **KPI:** Usability validation — at least 10 users in prototype testing.  
  **Status:** Met. 12 users tested the prototype in M3; feedback incorporated.

- **KPI:** Final close-out materials (report & short video) published.  
  **Status:** Met — this document and the final video link included below.

---

## 4. Key achievements (collaboration & engagement)

- Transitioned from research and prototype to a **mainnet-deployed wallet** with password-based authentication using ZK proofs.
- Open-source release and transparent milestone reporting ([REPORT-M1](https://github.com/leobel/janus-wallet/blob/main/REPORT-M1.md), [REPORT-M2](https://github.com/leobel/janus-wallet/blob/main/REPORT-M2.md), [REPORT-M3](https://github.com/leobel/janus-wallet/blob/main/REPORT-M3.md)) enabled community inspection and reproducibility.
- Prototype user testing rounds produced actionable feedback that informed UI/UX and technical fixes before mainnet deployment.

---

## 5. Key learnings

- **Circuit & ZK complexity:** circuit design and trusted-setup processes require careful tooling and testing; developer docs and test vectors were added to the repo to reduce onboarding friction for contributors.
- **User-facing latency during proof generation:** long-running proof steps can confuse users; UI spinners and progress indicators were implemented after M3 testing.
- **Mainnet considerations:** UTxO management and transaction optimization are important for production; Groth16 succinct proofs and optimized transaction construction reduced on-chain footprint and fees.

---

## 6. What went differently than planned (scope, timetable)

- The technical research phase required deeper investigation of circuit portability and proof compression than initially estimated. This added time to development but was absorbed within the planned milestone structure.
- Transaction fees were expected to be between 0.2–0.4 ADA; however, observed mainnet transaction fees currently average around ~0.6 ADA per relevant flow, which increased operational cost compared to initial estimates.
- The password update flow currently replaces the wallet address (generating a new on-chain identity/address) which was not part of the original workflow. This replacement impacts user experience (e.g., scheduled or incoming transfers to the old address are lost) and required additional UI/UX work to clarify consequences and provide migration guidance.

---

## 7. Next steps (product roadmap / sustainability)

- **Maintenance & monitoring:** set up long-term monitoring for mainnet wallet availability and on-chain metrics (wallet creations, transactions, delegation actions).
- **Transaction fee optimization**: investigate transaction construction and UTxO consolidation strategies to reduce per-action fees (optimize UTxO packing, batch operations where possible, explore alternative on-chain patterns and serialization optimizations). Implement monitoring and A/B testing to validate fee improvements and target bringing average transactional cost closer to the 0.2–0.4 ADA range originally expected.
- **Password update UX improvements**: redesign the password-update flow to avoid silently replacing the on-chain wallet address or, if replacement is necessary for security, introduce a clear migration flow: show old vs. new addresses, warn users of implications (lost incoming transfers to old address), offer an address-forwarding or recovery notice, and provide step-by-step guidance to preserve continuity. Consider alternatives such as account linking or aliasing to maintain UX continuity while preserving security guarantees.
- **Wallet contract abstraction**: abstract the wallet's smart contract logic into a wallet manager contract that allows users to opt in/out different validators. ZK-Proof verification will remain the core fallback validator. This approach enables the wallet to handle interactions with third-party smart contracts on behalf of users without forcing funds to be locked into external contracts—reducing UX friction and increasing composability and security.
- **Dynamic collateral provider & operational resilience**: design and integrate a robust, dynamic collateral provider system to handle peaks in wallet operations (e.g., high proof-generation or batch transaction scenarios) without compromising on-chain transaction success. This solution should include automated scaling mechanisms for collateral provisioning, failover strategies, cost controls, and monitoring/alerting to ensure operations continue during spikes.

---

## 8. Final thoughts / comments

Janus wallet demonstrates a production-ready path for password-based zk-wallets on Cardano. The project balanced research, prototyping and production work with open-source transparency. We welcome further community testing and will continue to publish updates and improvements in the public repo.

---

## 9. Links & Evidence (required)

- **Project page (IdeaScale / Fund):** https://projectcatalyst.io/funds/13/cardano-use-cases-concept/janus-wallet-simplified-cardano-onboarding-with-zk-proof
- **Project number:** #1300120
- **Live mainnet wallet:** https://januswallet.xyz/
- **Preprod demo:** https://preprod.januswallet.xyz/
- **Repository & docs:** https://github.com/leobel/janus-wallet
- **Milestone reports:** [REPORT-M1](https://github.com/leobel/janus-wallet/blob/main/REPORT-M1.md), [REPORT-M2](https://github.com/leobel/janus-wallet/blob/main/REPORT-M2.md), [REPORT-M3](https://github.com/leobel/janus-wallet/blob/main/REPORT-M3.md)
- **Final close-out video:** https://www.youtube.com/watch?v=sUqTIeuMycA
