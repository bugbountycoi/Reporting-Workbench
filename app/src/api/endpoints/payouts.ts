import { API_CONFIG } from '../../config/api'
import { apiGet } from '../client'
import type { PayoutViewModel, RewardRequestOverviewViewModel, PaginatedResponse, RewardBudget } from '../types'
import payoutsSample from '../../fixtures/payouts.sample.json'
import rewardRequestsSample from '../../fixtures/rewardRequests.sample.json'

export async function getAllPayouts(): Promise<PayoutViewModel[]> {
  if (API_CONFIG.mockMode) return payoutsSample as PayoutViewModel[]
  return apiGet<PayoutViewModel[]>('/payouts')
}

export async function getAllRewardRequests(): Promise<RewardRequestOverviewViewModel[]> {
  if (API_CONFIG.mockMode) return rewardRequestsSample as RewardRequestOverviewViewModel[]

  const pageSize = 200
  let offset = 0
  const all: RewardRequestOverviewViewModel[] = []

  while (true) {
    const page = await apiGet<PaginatedResponse<RewardRequestOverviewViewModel>>(
      '/reward-system/reward-requests',
      { Limit: pageSize, Offset: offset },
    )
    all.push(...page.records)
    if (all.length >= page.maxCount || page.records.length < pageSize) break
    offset += pageSize
  }

  return all
}

export async function getRewardBudget(): Promise<RewardBudget> {
  if (API_CONFIG.mockMode) {
    return {
      available: { value: 42000, currency: 'USD' },
      spent: { value: 58000, currency: 'USD' },
      total: { value: 100000, currency: 'USD' },
    }
  }
  return apiGet<RewardBudget>('/reward-system/budget')
}
