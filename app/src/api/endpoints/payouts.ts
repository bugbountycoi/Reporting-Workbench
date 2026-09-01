import { getMockMode, getCacheMode } from '../../config/api'
import { apiGet } from '../client'
import { fixture } from '../fixtureLoader'
import { hasCacheFolder, saveDataChunk, readFromCache } from '../../cache/manager'
import { getCacheEncryptionKey } from '../../cache/cacheConfig'
import type { PayoutViewModel, RewardRequestOverviewViewModel, PaginatedResponse, RewardBudget } from '../types'

export async function getAllPayouts(): Promise<PayoutViewModel[]> {
  if (getMockMode()) return fixture.payouts() as Promise<PayoutViewModel[]>
  if (getCacheMode()) {
    const cached = await readFromCache<PayoutViewModel[]>('payouts', 'global')
    if (cached) return cached
    throw new Error('No cached payouts found — connect via Live API first to populate the cache.')
  }
  const data = await apiGet<PayoutViewModel[]>('/payouts')
  if (hasCacheFolder()) saveDataChunk('global', 'payouts', data, getCacheEncryptionKey()).catch(() => {})
  return data
}

export async function getAllRewardRequests(): Promise<RewardRequestOverviewViewModel[]> {
  if (getMockMode()) return fixture.rewardRequests() as Promise<RewardRequestOverviewViewModel[]>
  if (getCacheMode()) {
    const cached = await readFromCache<RewardRequestOverviewViewModel[]>('reward-requests', 'global')
    if (cached) return cached
    throw new Error('No cached reward requests found — connect via Live API first to populate the cache.')
  }

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

  if (hasCacheFolder()) saveDataChunk('global', 'reward-requests', all, getCacheEncryptionKey()).catch(() => {})
  return all
}

export async function getRewardBudget(): Promise<RewardBudget> {
  if (getMockMode()) {
    return {
      available: { value: 42000, currency: 'USD' },
      spent: { value: 58000, currency: 'USD' },
      total: { value: 100000, currency: 'USD' },
    }
  }
  if (getCacheMode()) {
    const cached = await readFromCache<RewardBudget>('reward-budget', 'global')
    if (cached) return cached
    throw new Error('No cached reward budget found — connect via Live API first to populate the cache.')
  }
  const data = await apiGet<RewardBudget>('/reward-system/budget')
  if (hasCacheFolder()) saveDataChunk('global', 'reward-budget', data, getCacheEncryptionKey()).catch(() => {})
  return data
}
