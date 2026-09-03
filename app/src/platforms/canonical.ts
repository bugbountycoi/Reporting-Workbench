import type { PlatformId } from './types'

export type { PlatformId }

export type CanonicalSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'informational'
  | 'unknown'

export type CanonicalState =
  | 'new'
  | 'triaged'
  | 'resolved'
  | 'closed'
  | 'invalid'
  | 'duplicate'
  | 'unknown'

export interface CanonicalProgram {
  id: string
  platform: PlatformId
  name: string
  handle: string
  logoUrl: string | null
  status: 'active' | 'paused' | 'closed' | 'unknown'
  type: 'public' | 'private' | 'unknown'
  url: string | null
}

export interface CanonicalSubmission {
  id: string
  platform: PlatformId
  programId: string
  title: string
  severity: CanonicalSeverity
  state: CanonicalState
  submittedAt: number
  updatedAt: number | null
  payoutAmount: number | null
  payoutCurrency: string | null
  researcherHandle: string | null
  url: string | null
}

export interface CanonicalPayout {
  id: string
  platform: PlatformId
  submissionId: string | null
  programId: string | null
  amount: number
  currency: string
  paidAt: number | null
  researcherHandle: string | null
  type: 'bounty' | 'bonus' | 'other'
}
