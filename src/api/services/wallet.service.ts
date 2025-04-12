import { fromText, Network, UTxO } from '@lucid-evolution/lucid';
import { getUserById } from '../../repositories/user.repository.js'
import { readValidators, generateSpendScript, spendTx, ZkInput } from '../../utils/prepare-contracts.js';
import { getLucid } from '../../utils/index.js';

const validators = readValidators();

export const spendWalletFunds = async (username: string, amount: number, receiveAddress: string, network: Network, assets: any) => {
    const tokenName = fromText(username)
    const userId = BigInt(`0x${tokenName}`).toString(16)
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }
    const { zk_verification_ref } = user
    const { address, tx_hash: txHash, output_index: outputIndex, lovelace, policy_id: policyId, datum } = zk_verification_ref
    
    const { spend, spendAddress } = generateSpendScript(validators.spend.script, network, policyId, tokenName)

    const assetUnit = `${policyId}${tokenName}`;
    const utxoRef: UTxO = {
        address,
        txHash,
        outputIndex,
        assets: { lovelace: BigInt(lovelace), [assetUnit]: BigInt(1) },
        datum
    }
    const validTo = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

    const zkInput: ZkInput = {
        userId: userId,
        hash: user.pwd_hash,
        // pwd: "12345"
    }

    // TODO: use cardano-inputSelection
    const utxo: UTxO = {
        address: spendAddress,
        txHash: "70008140f20476fe33cc3a977b3f7a61a08b1e46e994cb6f7179459d0ecb32f0",
        // txHash: "69667b3128ca08d307b29989b976f5cefeddd15b5e3b5517611aaddd1316c6a4",
        outputIndex: 1,
        assets: { lovelace: BigInt(38_593_550) }
    }
    
    const lucid = await getLucid;

    await spendTx(lucid, [utxoRef], [utxo], spendAddress, spend, BigInt(amount), validTo, receiveAddress, zkInput, policyId, tokenName, network, { localUPLCEval: true });

    return user.zk_verification_ref.tx_hash
};


