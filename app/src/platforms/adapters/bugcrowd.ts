import type { BugcrowdEngagement, BugcrowdSubmission } from '../../api/endpoints/bugcrowd'
import type { CanonicalProgram, CanonicalSubmission, CanonicalPayout, CanonicalSeverity, CanonicalState } from '../canonical'

function normalizeSeverity(severity: BugcrowdSubmission['severity']): CanonicalSeverity {
  switch (severity) {
    case 'p1': return 'critical'
    case 'p2': return 'high'
    case 'p3': return 'medium'
    case 'p4': return 'low'
    case 'p5': return 'informational'
    default: return 'unknown'
  }
}

function normalizeState(state: BugcrowdSubmission['state']): CanonicalState {
  switch (state) {
    case 'new': return 'new'
    case 'triaged':
    case 'unresolved': return 'triaged'
    case 'resolved': return 'resolved'
    case 'not_applicable': return 'invalid'
    case 'duplicate': return 'duplicate'
    default: return 'unknown'
  }
}

export function adaptBcEngagements(raw: BugcrowdEngagement[]): CanonicalProgram[] {
  return raw.map((e) => ({
    id: e.id,
    platform: 'bugcrowd' as const,
    name: e.name,
    handle: e.code,
    logoUrl: null,
    status: e.status === 'open' ? 'active' : 'closed',
    type: 'private' as const,
    url: null,
  }))
}

export function adaptBcSubmissions(raw: BugcrowdSubmission[]): CanonicalSubmission[] {
  return raw.map((s) => ({
    id: s.id,
    platform: 'bugcrowd' as const,
    programId: s.engagement_id,
    title: s.title,
    severity: normalizeSeverity(s.severity),
    state: normalizeState(s.state),
    submittedAt: new Date(s.submitted_at).getTime(),
    updatedAt: null,
    payoutAmount: null,
    payoutCurrency: null,
    researcherHandle: null,
    url: null,
  }))
}

export function adaptBcPayouts(_raw: BugcrowdSubmission[]): CanonicalPayout[] {
  // Bugcrowd payout data is not available through the submissions endpoint.
  return []
}
