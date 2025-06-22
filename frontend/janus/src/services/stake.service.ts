import axios from "../api/axios";
import type { PaginateResponse } from "../models/paginate-response";
import type { StakePool } from "../models/stake-pool";
import type { Reward } from "../models/stake-reward";

export async function getStakePools(count: number, page: number, order = "asc"): Promise<PaginateResponse<StakePool>> {
    const response = await axios.get<PaginateResponse<StakePool>>(`stakePools?count=${count}&page=${page}&order=${order}`)
    return response.data
}

export async function getStakeRewards(userId: string, count: number, page: number, order = "desc"): Promise<PaginateResponse<Reward>> {
    const response = await axios.get<PaginateResponse<Reward>>(`wallets/${userId}/rewards?count=${count}&page=${page}&order=${order}`)
    return response.data
}