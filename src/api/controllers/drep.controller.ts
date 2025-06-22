import { Request, Response } from 'express'
import { parsePaginateParams } from '../../utils'
import { getDrepDetails, getDreps } from '../services/drep.service'

export async function listDReps(req: Request, res: Response) {
    try {
        const params = parsePaginateParams(req)
        const pools = await getDreps(params)
        res.json(pools)
    } catch (err) {
        res.sendStatus(500)        
    }
}

export async function getDrep(req: Request, res: Response) {
    try {
        const { drepId } = req.params
        const drep = await getDrepDetails(drepId)
        res.json(drep)
    } catch (err) {
        res.sendStatus(500) 
    }
}