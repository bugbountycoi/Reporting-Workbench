import { API_CONFIG } from '../../config/api'
import { apiGet } from '../client'
import type { ProgramOverviewViewModel, ProgramDetailViewModel, SubmissionOverviewViewModel } from '../types'
import programsSample from '../../fixtures/programs.sample.json'
import submissionsSample from '../../fixtures/submissions.sample.json'

export async function getPrograms(): Promise<ProgramOverviewViewModel[]> {
  if (API_CONFIG.mockMode) return programsSample as ProgramOverviewViewModel[]
  return apiGet<ProgramOverviewViewModel[]>('/programs')
}

export async function getProgramDetail(programId: string): Promise<ProgramDetailViewModel> {
  if (API_CONFIG.mockMode) {
    const found = (programsSample as ProgramOverviewViewModel[]).find((p) => p.id === programId)
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
    const all = submissionsSample as SubmissionOverviewViewModel[]
    return all.filter((s) => s.originators.programId === programId)
  }
  return apiGet<SubmissionOverviewViewModel[]>(`/programs/${programId}/submissions`, {
    UpdatedSince: updatedSince,
  })
}
