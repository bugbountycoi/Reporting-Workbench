import { getMockMode, getCacheMode } from '../../config/api'
import { apiGet } from '../client'
import { fixture } from '../fixtureLoader'
import { hasCacheFolder, saveDataChunk, readFromCache } from '../../cache/manager'
import { getCacheEncryptionKey } from '../../cache/cacheConfig'
import type { SubmissionOverviewViewModel, SubmissionDetailsViewModel } from '../types'

export async function getAllSubmissions(updatedSince?: number): Promise<SubmissionOverviewViewModel[]> {
  if (getMockMode()) return fixture.submissions() as Promise<SubmissionOverviewViewModel[]>
  if (getCacheMode()) {
    const cached = await readFromCache<SubmissionOverviewViewModel[]>('submissions', 'global')
    if (cached) return cached
    throw new Error('No cached submissions found — connect via Live API first to populate the cache.')
  }
  const data = await apiGet<SubmissionOverviewViewModel[]>('/submissions', { UpdatedSince: updatedSince })
  if (hasCacheFolder()) saveDataChunk('global', 'submissions', data, getCacheEncryptionKey()).catch(() => {})
  return data
}

export async function getSubmissionDetail(code: string): Promise<SubmissionDetailsViewModel> {
  if (getMockMode()) {
    const all = await fixture.submissions() as SubmissionOverviewViewModel[]
    const found = all.find((s) => s.code === code)
    if (!found) throw new Error(`Mock: submission ${code} not found`)
    return found as unknown as SubmissionDetailsViewModel
  }
  if (getCacheMode()) {
    const cached = await readFromCache<SubmissionDetailsViewModel>('submission-detail', code)
    if (cached) return cached
    throw new Error(`No cached detail found for submission ${code}.`)
  }
  const data = await apiGet<SubmissionDetailsViewModel>(`/submissions/${code}`)
  if (hasCacheFolder()) saveDataChunk(code, 'submission-detail', data, getCacheEncryptionKey()).catch(() => {})
  return data
}
