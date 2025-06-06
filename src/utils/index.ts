import 'dotenv/config';
import { Request } from 'express'
import { Blockfrost, Lucid, Network } from '@lucid-evolution/lucid';
import type { PaginateOrder, PaginateParams } from '../models/ledger/paginate-params';

export const getLucid = (async () => {
    const lucid = await Lucid(
        new Blockfrost(
            process.env.BLOCKFROST_API_URL!,
            process.env.BLOCKFROST_API_KEY!
        ),
        (process.env.CARDANO_NETWORK)! as Network
    );
    return lucid;
})();

export function parsePaginateParams(req: Request): PaginateParams {
    const params: PaginateParams = {order: req.query.order as PaginateOrder}
    const count = parseInt(req.query.count as string)
    const page = parseInt(req.query.page as string)
    if (!isNaN(count)) {
        params.count = count
    }
    if (!isNaN(page)) {
        params.page = page
    }

    return params
}