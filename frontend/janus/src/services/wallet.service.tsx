import axios from "../api/axios";

export async function getWalletBalance(userId: string): Promise<any> {
    const response = await axios.get(`wallets/${userId}/balance`)
    return response.data
}