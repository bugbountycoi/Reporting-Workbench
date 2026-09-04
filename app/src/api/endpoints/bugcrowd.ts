import { getMockMode } from '../../config/api'
import { apiFetch } from '../client'

export interface BugcrowdEngagement {
  id: string
  name: string
  code: string
  status: 'open' | 'closed'
  submission_count: number
}

export interface BugcrowdSubmission {
  id: string
  title: string
  severity: 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  state: 'new' | 'triaged' | 'unresolved' | 'resolved' | 'not_applicable' | 'duplicate'
  submitted_at: string
  engagement_id: string
}

interface BcEnvelope<T> {
  data: T[]
  meta?: {
    total_hits?: number
    page_limit?: number
    offset?: number
  }
  links?: {
    self?: string
    next?: string
  }
}

async function bcGetAll<T>(path: string): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const res = await apiFetch<BcEnvelope<T>>(`${path}?page[limit]=${limit}&page[offset]=${offset}`)
    all.push(...res.data)
    if (res.data.length < limit) break
    offset += limit
  }
  return all
}

let _bcSubmissionFixture: BugcrowdSubmission[] | null = null

async function getBcFixture(): Promise<BugcrowdSubmission[]> {
  if (_bcSubmissionFixture) return _bcSubmissionFixture
  const mod = await import('../../reports/bugcrowdSubmissions/fixtures')
  _bcSubmissionFixture = mod.bcSubmissionFixtures as BugcrowdSubmission[]
  return _bcSubmissionFixture
}

export async function bcGetEngagements(): Promise<BugcrowdEngagement[]> {
  if (getMockMode()) {
    const subs = await getBcFixture()
    const seen = new Set<string>()
    const engagements: BugcrowdEngagement[] = []
    for (const s of subs) {
      if (seen.has(s.engagement_id)) continue
      seen.add(s.engagement_id)
      const count = subs.filter((x) => x.engagement_id === s.engagement_id).length
      engagements.push({
        id: s.engagement_id,
        name: `Engagement ${s.engagement_id.toUpperCase()}`,
        code: s.engagement_id,
        status: 'open',
        submission_count: count,
      })
    }
    return engagements
  }
  return bcGetAll<BugcrowdEngagement>('/engagements')
}

export async function bcGetEngagementSubmissions(engagementId: string): Promise<BugcrowdSubmission[]> {
  if (getMockMode()) {
    const subs = await getBcFixture()
    return subs.filter((s) => s.engagement_id === engagementId)
  }
  return bcGetAll<BugcrowdSubmission>(`/engagements/${engagementId}/submissions`)
}
