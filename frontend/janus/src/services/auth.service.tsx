import axios from "../api/axios";
import type { UserSession } from "../models/user";

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