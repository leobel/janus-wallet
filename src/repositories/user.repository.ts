import { db } from '../db/database.js'
import type { ChangePasswordTx } from '../models/change-pwd-tx.js'
import type { ChangePassword } from '../models/change-pwd.js'
import type { Circuit } from '../models/circuit.js'
import { User } from '../models/user.js'

export const createUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    const [newUser] = await db('users')
        .insert({ 
            token_status: user.token_status,
            token_name: user.token_name,
            pwd_hash: user.pwd_hash,
            pwd_kdf_hash: user.pwd_kdf_hash,
            spend_address: user.spend_address,
            policy_id: user.policy_id,
            nonce: user.nonce,
            spend_script: user.spend_script,
            mint_utxo_ref: user.mint_utxo_ref,
            circuit_id: user.circuit_id,
        })
        .returning('*')
    return newUser
}

export const changeUserPassword = async (ch: Omit<ChangePassword, 'id' | 'created_at' | 'updated_at'>): Promise<ChangePassword> => {
    const [changePwd] = await db('change_passwords')
        .insert({ 
            user_id: ch.user_id,
            spend_address: ch.spend_address,
            pwd_hash: ch.pwd_hash,
            pwd_kdf_hash: ch.pwd_kdf_hash,
            nonce: ch.nonce,
            spend_script: ch.spend_script,
            mint_utxo_ref: ch.mint_utxo_ref,
            balance: ch.balance
        })
        .returning('*')
    return changePwd
}


export const getChangeUserPasswordById = async (id: string): Promise<ChangePassword | null> => {
    return await db('change_passwords')
        .where({ id })
        .first()
}

export const updateChangeUserPassword = async (id: string, data: Partial<Omit<ChangePassword, 'id' | 'created_at' | 'updated_at'>>): Promise<ChangePassword> => {
    const [tx] = await db('change_passwords').where({ id })
        .update(data)
        .returning('*')
    return tx
}

export const changeUserPasswordTx = async (txs: Omit<ChangePasswordTx, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> => {
    await db('change_password_txs').insert(txs)
}

export const getChangeUserPasswordTxById = async (txId: string): Promise<ChangePasswordTx | null> => {
    return await db('change_password_txs')
        .where({ tx_id: txId })
        .first()
}

export const updateChangeUserPasswordTxByTxId = async (txId: string, data: Partial<Omit<ChangePasswordTx, 'id' | 'created_at' | 'updated_at'>>): Promise<ChangePasswordTx> => {
    const [tx] = await db('change_password_txs').where({ tx_id: txId })
        .update(data)
        .returning('*')
    return tx
}

export const updateUser = async (userId: string, data: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> => {
    const [user] = await db('users').where({ id: userId })
        .update(data)
        .returning('*')
    return user
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