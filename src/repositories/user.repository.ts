import { db } from '../db/database.js'
import { User } from '../models/user.js'

export const createUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    const [newUser] = await db('users')
        .insert({ 
            user_id: user.user_id,
            pwd_hash: user.pwd_hash,
            zk_verification_ref: user.zk_verification_ref
        })
        .returning('*')
    return newUser
}

export const getUserById = async (userId: string): Promise<User | null> => {
    return await db('users')
        .where({ user_id: userId })
        .first()
}