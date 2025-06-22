import { Request, Response } from 'express'
import { getStakePools } from '../services/stake.service'
import { parsePaginateParams } from '../../utils'

export async function listStakePools(req: Request, res: Response) {
    try {
        const params = parsePaginateParams(req)
        const pools = await getStakePools(params)
        res.json(pools)
    } catch (err) {
        res.sendStatus(500)        
    }
}