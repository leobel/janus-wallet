import axios from "../api/axios";

export async function login(username: string, password: string): Promise<string> {
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