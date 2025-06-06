import type { PaginateParams } from "./paginate-params";

export interface PaginateResponse<T> {
    items: T[]
    hasMore: boolean
    next: PaginateParams | null
}