import { validatorToRewardAddress, type CertificateValidator, type Network } from "@lucid-evolution/lucid";
import type { PaginateParams } from "../../models/ledger/paginate-params";
import type { PaginateResponse } from "../../models/ledger/paginate-response";
import type { StakePool } from "../../models/ledger/stake-pool";
import { getPagination, getStakingRewards, getStakePools as listStakePools, paginateResponse } from "../../utils/ledger-api";
import type { Reward } from "../../models/ledger/stake-reward";
import { getUserById } from "../../repositories/user.repository";

export async function getStakePools(params: PaginateParams): Promise<PaginateResponse<StakePool>> {
    const { count, page, order } = getPagination(params)
    const pools = await listStakePools(count, page, order)
    return paginateResponse(pools, { count, page, order })
} 

export async function getStakingRewardsHistory(network: Network, userId: string, params: PaginateParams): Promise<PaginateResponse<Reward>> {
    const user = await getUserById(userId)
    if (!user) {
        throw new Error('User not found')
    }

    const stakeAddress = validatorToRewardAddress(network, user.spend_script as CertificateValidator)
    const { count, page, order } = getPagination(params, "desc")
    const rewards = await getStakingRewards(stakeAddress, count, page, order)
    return paginateResponse(rewards.map(r => ({...r, amount: Number(r.amount)})), { count, page, order })
}