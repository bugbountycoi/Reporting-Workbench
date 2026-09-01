import { getMockMode, getCacheMode } from '../../config/api'
import { apiGet } from '../client'
import { fixture } from '../fixtureLoader'
import { hasCacheFolder, saveDataChunk, readFromCache } from '../../cache/manager'
import { getCacheEncryptionKey } from '../../cache/cacheConfig'
import type { ProgramOverviewViewModel, ProgramDetailViewModel, SubmissionOverviewViewModel } from '../types'

export async function getPrograms(): Promise<ProgramOverviewViewModel[]> {
  if (getMockMode()) return fixture.programs() as Promise<ProgramOverviewViewModel[]>
  if (getCacheMode()) {
    const cached = await readFromCache<ProgramOverviewViewModel[]>('programs', 'global')
    if (cached) return cached
    throw new Error('No cached programs found — connect via Live API first to populate the cache.')
  }
  const data = await apiGet<ProgramOverviewViewModel[]>('/programs')
  if (hasCacheFolder()) saveDataChunk('global', 'programs', data, getCacheEncryptionKey()).catch(() => {})
  return data
}

export async function getProgramDetail(programId: string): Promise<ProgramDetailViewModel> {
  if (getMockMode()) {
    const all = await fixture.programs() as ProgramOverviewViewModel[]
    const found = all.find((p) => p.id === programId)
    if (!found) throw new Error(`Mock: program ${programId} not found`)
    return found as unknown as ProgramDetailViewModel
  }
  if (getCacheMode()) {
    const cached = await readFromCache<ProgramDetailViewModel>('program-detail', programId)
    if (cached) return cached
    throw new Error(`No cached detail found for program ${programId}.`)
  }
  const data = await apiGet<ProgramDetailViewModel>(`/programs/${programId}`)
  if (hasCacheFolder()) saveDataChunk(programId, 'program-detail', data, getCacheEncryptionKey()).catch(() => {})
  return data
}

export async function getProgramSubmissions(
  programId: string,
  updatedSince?: number,
): Promise<SubmissionOverviewViewModel[]> {
  if (getMockMode()) {
    const all = await fixture.submissions() as SubmissionOverviewViewModel[]
    return all.filter((s) => s.originators.programId === programId)
  }
  if (getCacheMode()) {
    const cached = await readFromCache<SubmissionOverviewViewModel[]>('program-submissions', programId)
    if (cached) return cached
    throw new Error(`No cached submissions found for program ${programId}.`)
  }
  const data = await apiGet<SubmissionOverviewViewModel[]>(`/programs/${programId}/submissions`, {
    UpdatedSince: updatedSince,
  })
  if (hasCacheFolder()) saveDataChunk(programId, 'program-submissions', data, getCacheEncryptionKey()).catch(() => {})
  return data
}
