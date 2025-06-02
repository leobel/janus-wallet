import type { PaginateParams } from "./paginate-params";
import type { StakePool } from "./stake-pool";

export interface StakePoolResponse {
    pools: StakePool[]
    hasMore: boolean
    next: PaginateParams | null
}