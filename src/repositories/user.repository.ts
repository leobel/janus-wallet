import { db } from '../db/database.js'
import { User } from '../models/user.js'

export const createUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    const [newUser] = await db('users')
        .insert({ 
            token_name: user.token_name,
            pwd_hash: user.pwd_hash,
            pwd_kdf_hash: user.pwd_kdf_hash,
            spend_address: user.spend_address,
            policy_id: user.policy_id,
            nonce: user.nonce,
            spend_script: user.spend_script,
            mint_utxo_ref: user.mint_utxo_ref
        })
        .returning('*')
    return newUser
}

export const getUserById = async (userId: string): Promise<User | null> => {
    return await db('users')
        .where({ id: userId })
        .first()
}

export const getUserByTokenName = async (tokenName: string): Promise<User | null> => {
    return await db('users')
        .where({ token_name: tokenName })
        .first()
}