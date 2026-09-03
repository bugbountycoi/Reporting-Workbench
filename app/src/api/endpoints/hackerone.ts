import { getMockMode } from '../../config/api'
import { apiFetch } from '../client'

export interface H1Program {
  id: string
  handle: string
  name: string
  state: 'open' | 'soft_launch' | 'closed' | 'suspended'
  offers_bounties: boolean
  submission_state: 'open' | 'closed'
  website: string | null
  profile_picture: string | null
}

export interface H1ReportSeverity {
  rating: 'none' | 'low' | 'medium' | 'high' | 'critical'
  score: number | null
}

export interface H1Report {
  id: string
  title: string
  state:
    | 'new'
    | 'pending-program-review'
    | 'triaged'
    | 'needs-more-info'
    | 'resolved'
    | 'not-applicable'
    | 'informational'
    | 'duplicate'
    | 'spam'
    | 'retesting'
  severity: H1ReportSeverity | null
  bounty_amount: string | null
  currency: string
  created_at: string
  closed_at: string | null
  weakness: { id: string; name: string } | null
  reporter: { username: string } | null
  relationships: {
    program: { data: { id: string; type: 'program' } }
  }
}

interface H1Envelope<T> {
  data: T[]
  links: {
    self: string
    next?: string
    prev?: string
    first?: string
    last?: string
  }
}

async function h1GetAll<T>(path: string): Promise<T[]> {
  const all: T[] = []
  let url = `${path}?page[number]=1&page[size]=100`
  while (url) {
    const res = await apiFetch<H1Envelope<T>>(url)
    all.push(...res.data)
    url = res.links.next ? res.links.next.replace(/^.*\/v1/, '') : ''
  }
  return all
}

let _h1ReportFixture: H1Report[] | null = null

async function getH1Fixture(): Promise<H1Report[]> {
  if (_h1ReportFixture) return _h1ReportFixture
  const mod = await import('../../reports/hackeroneReportsOverview/fixtures')
  _h1ReportFixture = mod.h1ReportFixtures as H1Report[]
  return _h1ReportFixture
}

export async function h1GetPrograms(): Promise<H1Program[]> {
  if (getMockMode()) {
    const reports = await getH1Fixture()
    const seen = new Set<string>()
    const programs: H1Program[] = []
    for (const r of reports) {
      const id = r.relationships.program.data.id
      if (seen.has(id)) continue
      seen.add(id)
      programs.push({
        id,
        handle: `program-${id}`,
        name: `Program ${id}`,
        state: 'open',
        offers_bounties: true,
        submission_state: 'open',
        website: null,
        profile_picture: null,
      })
    }
    return programs
  }
  return h1GetAll<H1Program>('/hackers/me/programs')
}

export async function h1GetReports(): Promise<H1Report[]> {
  if (getMockMode()) return getH1Fixture()
  return h1GetAll<H1Report>('/hackers/me/reports')
}
