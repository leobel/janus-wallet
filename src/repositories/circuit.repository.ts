import { db } from '../db/database.js'
import { Circuit } from '../models/circuit.js'

export const createCircuit = async (circuit: Omit<Circuit, 'id' | 'created_at' | 'updated_at'>): Promise<Circuit> => {
    const [newCircuit] = await db('circuits')
        .insert({ 
            version: circuit.version,
            signer_key: circuit.signer_key,
            nonce: circuit.nonce,
            policy_id: circuit.policy_id,
            asset_name: circuit.asset_name,
            mint_address: circuit.mint_address,
            mint_utxo_ref: circuit.mint_utxo_ref,
            mint_script: circuit.mint_script,
            zk_verification_key: circuit.zk_verification_key
        })
        .returning('*')
    return newCircuit
}

export const getCircuit = async (): Promise<Circuit | null> => {
    return await db('circuits')
        .orderBy("version", "desc")
        .first()
}

export const getCircuitById = async (circuitId: string): Promise<Circuit | null> => {
    return await db('circuits').where({ id: circuitId })
        .first()
}