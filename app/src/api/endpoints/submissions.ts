import { API_CONFIG } from '../../config/api'
import { apiGet } from '../client'
import { fixture } from '../fixtureLoader'
import type { SubmissionOverviewViewModel, SubmissionDetailsViewModel } from '../types'

export async function getAllSubmissions(updatedSince?: number): Promise<SubmissionOverviewViewModel[]> {
  if (API_CONFIG.mockMode) return fixture.submissions() as Promise<SubmissionOverviewViewModel[]>
  return apiGet<SubmissionOverviewViewModel[]>('/submissions', { UpdatedSince: updatedSince })
}

export async function getSubmissionDetail(code: string): Promise<SubmissionDetailsViewModel> {
  if (API_CONFIG.mockMode) {
    const all = await fixture.submissions() as SubmissionOverviewViewModel[]
    const found = all.find((s) => s.code === code)
    if (!found) throw new Error(`Mock: submission ${code} not found`)
    return found as unknown as SubmissionDetailsViewModel
  }
  return apiGet<SubmissionDetailsViewModel>(`/submissions/${code}`)
}
