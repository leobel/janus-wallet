export type PaginateOrder = "asc"| "desc"

export interface PaginateParams {
    count?: number, 
    page?: number,
    order?: PaginateOrder
}