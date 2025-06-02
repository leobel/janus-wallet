import { Request, Response } from 'express'
import { getStakePools } from '../services/stake.servce'
import type { PaginateParams } from '../../models/ledger/paginate-params'

export async function listStakePools(req: Request, res: Response) {
    try {
        const params: PaginateParams = {}
        const c = parseInt(req.query.count as string)
        const p = parseInt(req.query.page as string)
        if (!isNaN(c)) {
            params.count = c
        }
        if (!isNaN(p)) {
            params.page = p
        }
        const pools = await getStakePools(params)
        res.json(pools)
    } catch (err) {
        res.sendStatus(500)        
    }
}