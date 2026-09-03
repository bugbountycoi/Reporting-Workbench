import type { ProgramOverviewViewModel, SubmissionOverviewViewModel, PayoutViewModel } from '../../api/types'
import type { CanonicalProgram, CanonicalSubmission, CanonicalPayout, CanonicalSeverity, CanonicalState } from '../canonical'

function normalizeSeverity(value: string): CanonicalSeverity {
  switch (value.toLowerCase()) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    case 'low': return 'low'
    case 'exceptional': return 'informational'
    case 'informational':
    case 'info': return 'informational'
    default: return 'unknown'
  }
}

function normalizeState(statusValue: string, closeReasonValue: string | null): CanonicalState {
  const s = statusValue.toLowerCase()
  if (s.includes('duplicate')) return 'duplicate'
  if (s.includes('invalid') || s.includes('n/a') || s.includes('not applicable')) return 'invalid'
  if (s.includes('resolved') || s.includes('accepted')) return 'resolved'
  if (s.includes('closed')) return 'closed'
  if (s.includes('triage') || s.includes('triaging')) return 'triaged'
  if (s.includes('pending') || s.includes('awaiting') || s.includes('new')) return 'new'
  if (closeReasonValue) {
    const cr = closeReasonValue.toLowerCase()
    if (cr.includes('duplicate')) return 'duplicate'
    if (cr.includes('invalid') || cr.includes('n/a')) return 'invalid'
    if (cr.includes('resolved')) return 'resolved'
  }
  return 'unknown'
}

function normalizeProgramStatus(value: string): CanonicalProgram['status'] {
  const v = value.toLowerCase()
  if (v.includes('open') || v.includes('active')) return 'active'
  if (v.includes('paused') || v.includes('suspend')) return 'paused'
  if (v.includes('closed') || v.includes('archived')) return 'closed'
  return 'unknown'
}

function normalizeProgramType(value: string): CanonicalProgram['type'] {
  const v = value.toLowerCase()
  if (v.includes('public')) return 'public'
  if (v.includes('private')) return 'private'
  return 'unknown'
}

export function adaptPrograms(raw: ProgramOverviewViewModel[]): CanonicalProgram[] {
  return raw.map((p) => ({
    id: p.id,
    platform: 'intigriti' as const,
    name: p.name,
    handle: p.handle,
    logoUrl: p.logoUrl,
    status: normalizeProgramStatus(p.status.value),
    type: normalizeProgramType(p.type?.value ?? ''),
    url: p.webLinks?.details ?? null,
  }))
}

export function adaptSubmissions(
  raw: SubmissionOverviewViewModel[],
  programId: string,
): CanonicalSubmission[] {
  return raw.map((s) => ({
    id: s.code,
    platform: 'intigriti' as const,
    programId: s.originators.programId ?? programId,
    title: s.title,
    severity: normalizeSeverity(s.severity.value),
    state: normalizeState(
      s.state.status.value,
      s.state.closeReason?.value ?? null,
    ),
    submittedAt: s.createdAt,
    updatedAt: s.lastUpdatedAt,
    payoutAmount: s.totalPayout?.value ?? null,
    payoutCurrency: s.totalPayout?.currency ?? null,
    researcherHandle: s.submitter?.userName ?? null,
    url: s.webLinks?.details ?? null,
  }))
}

export function adaptPayouts(raw: PayoutViewModel[]): CanonicalPayout[] {
  return raw.map((p) => ({
    id: p.id,
    platform: 'intigriti' as const,
    submissionId: p.originators.submissionCode ?? null,
    programId: p.originators.programId ?? null,
    amount: p.amount.value,
    currency: p.amount.currency,
    paidAt: p.paidAt ?? null,
    researcherHandle: p.researcher?.userName ?? null,
    type: normalizePayoutType(p.type?.value ?? ''),
  }))
}

function normalizePayoutType(value: string): CanonicalPayout['type'] {
  const v = value.toLowerCase()
  if (v.includes('bonus')) return 'bonus'
  if (v.includes('bounty') || v.includes('reward')) return 'bounty'
  return 'other'
}
