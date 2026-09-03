import type { H1Program, H1Report } from '../../api/endpoints/hackerone'
import type { CanonicalProgram, CanonicalSubmission, CanonicalPayout, CanonicalSeverity, CanonicalState } from '../canonical'

function normalizeSeverity(rating: string): CanonicalSeverity {
  switch (rating) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    case 'low': return 'low'
    case 'none': return 'informational'
    default: return 'unknown'
  }
}

function normalizeState(state: H1Report['state']): CanonicalState {
  switch (state) {
    case 'new':
    case 'needs-more-info':
    case 'pending-program-review': return 'new'
    case 'triaged':
    case 'retesting': return 'triaged'
    case 'resolved': return 'resolved'
    case 'not-applicable':
    case 'informational':
    case 'spam': return 'invalid'
    case 'duplicate': return 'duplicate'
    default: return 'unknown'
  }
}

function normalizeProgramState(state: H1Program['state']): CanonicalProgram['status'] {
  switch (state) {
    case 'open':
    case 'soft_launch': return 'active'
    case 'suspended': return 'paused'
    case 'closed': return 'closed'
    default: return 'unknown'
  }
}

export function adaptH1Programs(raw: H1Program[]): CanonicalProgram[] {
  return raw.map((p) => ({
    id: p.id,
    platform: 'hackerone' as const,
    name: p.name,
    handle: p.handle,
    logoUrl: p.profile_picture,
    status: normalizeProgramState(p.state),
    type: 'private' as const,
    url: p.website,
  }))
}

export function adaptH1Submissions(raw: H1Report[]): CanonicalSubmission[] {
  return raw.map((r) => ({
    id: r.id,
    platform: 'hackerone' as const,
    programId: r.relationships.program.data.id,
    title: r.title,
    severity: normalizeSeverity(r.severity?.rating ?? 'none'),
    state: normalizeState(r.state),
    submittedAt: new Date(r.created_at).getTime(),
    updatedAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
    payoutAmount: r.bounty_amount ? parseFloat(r.bounty_amount) : null,
    payoutCurrency: r.currency || 'USD',
    researcherHandle: r.reporter?.username ?? null,
    url: `https://hackerone.com/reports/${r.id}`,
  }))
}

export function adaptH1Payouts(raw: H1Report[]): CanonicalPayout[] {
  return raw
    .filter((r) => r.bounty_amount && parseFloat(r.bounty_amount) > 0)
    .map((r) => ({
      id: `h1-bounty-${r.id}`,
      platform: 'hackerone' as const,
      submissionId: r.id,
      programId: r.relationships.program.data.id,
      amount: parseFloat(r.bounty_amount!),
      currency: r.currency || 'USD',
      paidAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
      researcherHandle: r.reporter?.username ?? null,
      type: 'bounty' as const,
    }))
}
