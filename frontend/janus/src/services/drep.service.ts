import axios from "../api/axios";
import { AlwaysAbstain, AlwaysAbstainId, AlwaysNoConfidence, AlwaysNoConfidenceId, type Drep, type DrepType, type FixedDrepType } from "../models/drep";
import type { PaginateResponse } from "../models/paginate-response";
import { isDrepFixed } from "../utils";

export async function getDreps(count: number, page: number, order = "asc"): Promise<PaginateResponse<Drep>> {
    const response = await axios.get<PaginateResponse<Drep>>(`dreps?count=${count}&page=${page}&order=${order}`)
    return response.data
}

export async function getDrepDetails(drepId: string): Promise<Drep> {
    const response = await axios.get<Drep>(`dreps/${drepId}`)
    const drep = response.data
    let extra = {}
    if (!drep.hex) {
        extra = drep.drep_id === AlwaysAbstainId ? { 
            hex: AlwaysAbstain,
            is_always_abstain: true 
        } : 
        drep.drep_id === AlwaysNoConfidenceId ? { 
            hex: AlwaysNoConfidence,
            is_always_non_confindence: true 
        } : {}
    }
    return {...drep, ...extra}
}

export async function delegateToDrep(userId: string, drepHex: string | FixedDrepType, type: DrepType): Promise<{tx: string }> {
    const keyHex = isDrepFixed(type) ? drepHex : drepHex.slice(2) // remove "22" which isn’t part of your key hash—it’s CBOR metadata: major type + length.
    const response = await axios.post(`wallets/${userId}/dreps/${keyHex}/delegate`, {
        drep_type: type
    })
    return response.data
}
