import axios from "../api/axios";
import type { StakePoolResponse } from "../models/stake-pool-response";

export async function getStakePools(count: number, page: number): Promise<StakePoolResponse> {
    const response = await axios.get<StakePoolResponse>(`stakePools?count=${count}&page=${page}`)
    return response.data
}