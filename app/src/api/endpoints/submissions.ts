import { API_CONFIG } from '../../config/api'
import { apiGet } from '../client'
import type { SubmissionOverviewViewModel, SubmissionDetailsViewModel } from '../types'
import submissionsSample from '../../fixtures/submissions.sample.json'

export async function getAllSubmissions(updatedSince?: number): Promise<SubmissionOverviewViewModel[]> {
  if (API_CONFIG.mockMode) return submissionsSample as SubmissionOverviewViewModel[]
  return apiGet<SubmissionOverviewViewModel[]>('/submissions', { UpdatedSince: updatedSince })
}

export async function getSubmissionDetail(code: string): Promise<SubmissionDetailsViewModel> {
  if (API_CONFIG.mockMode) {
    const found = (submissionsSample as SubmissionOverviewViewModel[]).find((s) => s.code === code)
    if (!found) throw new Error(`Mock: submission ${code} not found`)
    return found as unknown as SubmissionDetailsViewModel
  }
  return apiGet<SubmissionDetailsViewModel>(`/submissions/${code}`)
}
