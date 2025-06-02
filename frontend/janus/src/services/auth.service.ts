import axios from "../api/axios";
import type { UserSession } from "../models/user-session";

export async function login(username: string, password: string): Promise<UserSession> {
    const response = await axios.post('login', {
        username,
        password
    })
    return response.data.user
}

export async function isLoggedIn(): Promise<any> {
    const response = await axios.get('auth/me')
    return response.data
}

export async function createAccount(username: string, hash: string, kdfHash: string, utxos: string[], changeAddress: string): Promise<{user: UserSession, cbor_tx: string}> {
    const response = await axios.post('register', {
        username,
        hash,
        kdf_hash: kdfHash,
        utxos,
        change_address: changeAddress
    })
    return response.data
}   