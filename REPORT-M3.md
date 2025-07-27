# 🧪 Janus Wallet – User Feedback Report

## Overview

Between Jun and July of 2025, a group of 12 early users tested the Janus zk-wallet prototype deployed on the Cardano **Preprod** network. Testers included:

- Stake pool operators
- Cardano developers
- Web3 power users
- Crypto-savvy users new to zero-knowledge proofs

The goal of this round was to validate usability, functionality, and gather actionable insights to improve the wallet experience.

---

## 📋 Summary Table

| Feature                  | Feedback Summary                                                                 | Action Taken                          |
|--------------------------|-----------------------------------------------------------------------------------|----------------------------------------|
| **Wallet Creation**      | Confusing behavior during circuit generation and proof setup                     | ✅ Improved UI & added spinner during account creation |
| **Send Transactions**    | Errors due to decimal inputs and invalid addresses                               | ✅ Added validation checks in frontend |
| **Password Update**      | Users didn’t realize address would change after update                           | ✅ Old address and explicative message shown in settings screen |
| **Delegation Options**   | Confusion between stake pool and DRep delegation                                 | ✅ Clarified terminology in UI |
| **Withdraw Rewards**     | Users didn’t understand governance requirement for withdrawal                    | ✅ Added tooltip and docs explanation |

---

## 🧪 Feedback Details

### 🔐 Wallet Creation

**Issue:**  
Several users were unsure what was happening during the account generation steps. The UX/UI wasn't intuitive enough.

**Fix:**  
- UI now displays a cleaner flow with brief explanation on each step.
- Errors now display descriptive messages (e.g. "User already exist").
<img width="1696" height="965" alt="Screenshot 2025-07-26 at 5 06 41 PM" src="https://github.com/user-attachments/assets/629fb328-e47d-46dc-872d-c141a44a63d8" />

---

### 💸 Send Transactions

**Issue:**  
- Process to select recipient, Amount, Assets etc was all in one non interactive form.

**Fix:**  
- Created a new view with a multi steps flow improving the UX/UI.
<img width="1725" height="990" alt="Screenshot 2025-07-26 at 12 43 09 PM" src="https://github.com/user-attachments/assets/1b12fcb8-33de-4ae8-8e82-d27e4fb71ac3" />


---

### 🔑 Password Update

**Issue:**  
Users didn’t understand that a password change generates a new verification key therefore **a new wallet address**.

**Fix:**  
- Users are advised to transfer funds and re-delegate before deleting the old address.
  <img width="1727" height="991" alt="Screenshot 2025-07-26 at 3 19 37 PM" src="https://github.com/user-attachments/assets/6d490c7b-4ffc-4939-a3b7-c6cec0d00624" />


---

### 🌊 Stake Delegation

**Issue:**  
Some users didn’t know the difference between delegating to a **stake pool** and a **DRep**.

**Fix:**  
- UI now clearly separates both options.
- Tooltips and small links to Cardano governance docs added.

Stake Pool
<img width="1726" height="989" alt="Screenshot 2025-07-26 at 12 44 42 PM" src="https://github.com/user-attachments/assets/f1963282-16a7-466b-aeea-8c8c680d9cba" />

DRep
<img width="1726" height="988" alt="Screenshot 2025-07-26 at 3 14 42 PM" src="https://github.com/user-attachments/assets/b74af1cc-a868-4fae-aef6-500472558254" />


---

### 💰 Withdraw Rewards

**Issue:**  
Users were blocked from withdrawing without knowing that delegation (even AlwaysAbstain or AlwaysNoConfidence) is **mandatory** under Chang.

**Fix:**  
- Added warning banner:  
  “Rewards will continue to accrue as usual, however you must delegate to a DRep before you can withdraw any reward.”
<img width="1726" height="991" alt="Screenshot 2025-07-26 at 5 27 26 PM" src="https://github.com/user-attachments/assets/9baad324-98ce-412b-8fbc-c9d6a99703d6" />

---

## 📈 Participation Summary

| Metric                      | Value        |
|-----------------------------|--------------|
| Total Users                 | 12           |
| Feedback Submissions        | 11           |
| Resolved Issues             | 8            |
| Pending Suggestions         | 1 (UI polish)|
| Regression Breaks Detected  | 0            |

---

## ✅ Outcome

All feedback was reviewed, categorized, and addressed via commits. Improvements were tested manually.

Commit history reflecting these changes can be found [here](https://github.com/leobel/janus-wallet/commits/main/).

---

## 📁 Resources

- 🔗 [Live Prototype](https://janus-wallet.xyz/)
- 📄 [User Guide](https://github.com/janus-wallet/janus/blob/main/docs/test-instructions.md)

---
