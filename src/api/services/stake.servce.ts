import type { PaginateParams } from "../../models/ledger/paginate-params";
import type { StakePoolResponse } from "../../models/ledger/stake-pool-response";
import { getStakePools as listStakePools } from "../../utils/ledger-api";

export async function getStakePools(params: PaginateParams): Promise<StakePoolResponse> {
    const {count = 100, page = 1} = params
    const size = Math.min(count, 100)
    const pools = await listStakePools(size, page)
    const hasMore = pools.length === size
    const next = hasMore ? { count: size, page: page + 1 } : null
    return {
        pools: pools.slice(0, size),
        hasMore,
        next
    }
} 