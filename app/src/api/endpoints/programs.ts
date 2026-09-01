import { API_CONFIG } from '../../config/api'
import { apiGet } from '../client'
import { fixture } from '../fixtureLoader'
import type { ProgramOverviewViewModel, ProgramDetailViewModel, SubmissionOverviewViewModel } from '../types'

export async function getPrograms(): Promise<ProgramOverviewViewModel[]> {
  if (API_CONFIG.mockMode) return fixture.programs() as Promise<ProgramOverviewViewModel[]>
  return apiGet<ProgramOverviewViewModel[]>('/programs')
}

export async function getProgramDetail(programId: string): Promise<ProgramDetailViewModel> {
  if (API_CONFIG.mockMode) {
    const all = await fixture.programs() as ProgramOverviewViewModel[]
    const found = all.find((p) => p.id === programId)
    if (!found) throw new Error(`Mock: program ${programId} not found`)
    return found as unknown as ProgramDetailViewModel
  }
  return apiGet<ProgramDetailViewModel>(`/programs/${programId}`)
}

export async function getProgramSubmissions(
  programId: string,
  updatedSince?: number,
): Promise<SubmissionOverviewViewModel[]> {
  if (API_CONFIG.mockMode) {
    const all = await fixture.submissions() as SubmissionOverviewViewModel[]
    return all.filter((s) => s.originators.programId === programId)
  }
  return apiGet<SubmissionOverviewViewModel[]>(`/programs/${programId}/submissions`, {
    UpdatedSince: updatedSince,
  })
}
