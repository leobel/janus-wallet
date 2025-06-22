import axios from "../api/axios";
import type { Drep, DrepType, FixedDrepType } from "../models/drep";
import type { PaginateResponse } from "../models/paginate-response";
import { isDrepFixed } from "../utils";

export async function getDreps(count: number, page: number, order = "asc"): Promise<PaginateResponse<Drep>> {
    const response = await axios.get<PaginateResponse<Drep>>(`dreps?count=${count}&page=${page}&order=${order}`)
    return response.data
}

export async function getDrepDetails(drepId: string): Promise<Drep> {
    const response = await axios.get<Drep>(`dreps/${drepId}`)
    return response.data
}

export async function delegateToDrep(userId: string, drepHex: string | FixedDrepType, type: DrepType): Promise<{tx: string }> {
    const keyHex = isDrepFixed(type) ? drepHex : drepHex.slice(2) // remove "22" which isn’t part of your key hash—it’s CBOR metadata: major type + length.
    const response = await axios.post(`wallets/${userId}/dreps/${keyHex}/delegate`, {
        drep_type: type
    })
    return response.data
}
