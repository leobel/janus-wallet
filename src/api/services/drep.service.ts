import type { Drep } from "../../models/ledger/drep";
import type { PaginateParams } from "../../models/ledger/paginate-params";
import type { PaginateResponse } from "../../models/ledger/paginate-response";

import { getDrep, getDrepMetadata, getPagination, getDreps as listDreps, paginateResponse } from "../../utils/ledger-api";

export async function getDreps(params: PaginateParams): Promise<PaginateResponse<Drep>> {
    const { count, page, order } = getPagination(params)
    const dreps = await listDreps(count, page, order)
    return paginateResponse(dreps, { count, page, order })
} 

export async function getDrepDetails(drepId: string): Promise<Drep> {
    let drep = await getDrep(drepId)
    try {
        const metadata = await getDrepMetadata(drepId)
        drep = { ...drep, ...metadata }
    } catch {}
    return drep
}