// ─── Primitives ──────────────────────────────────────────────────────────────

export interface EnumerationViewModel {
  id: number
  value: string
}

export interface MoneyViewModel {
  value: number
  currency: string
}

export interface UserViewModel {
  userId: string
  userName: string
  avatarUrl: string | null
  role: string | null
}

export interface CompanyUserViewModel extends UserViewModel {
  email: string
}

export interface ResearcherRanking {
  rank: number
  reputation: number
  streak: EnumerationViewModel
}

export interface ResearcherViewModel extends UserViewModel {
  ranking: ResearcherRanking
  identityChecked: boolean
}

// ─── Programs ────────────────────────────────────────────────────────────────

export interface ProgramOverviewViewModel {
  id: string
  handle: string
  companyId: string
  companyHandle: string
  logoUrl: string | null
  name: string
  status: EnumerationViewModel
  confidentialityLevel: EnumerationViewModel
  type: EnumerationViewModel
  webLinks: { details: string }
}

export interface BountyRowViewModel {
  low: MoneyViewModel | null
  medium: MoneyViewModel | null
  high: MoneyViewModel | null
  critical: MoneyViewModel | null
  exceptional: MoneyViewModel | null
}

export interface BountyViewModel {
  tier: string
  bounty: BountyRowViewModel
}

export interface DomainViewModel {
  id: string
  companyAssetId: string | null
  name: string
  motivation: string | null
  type: EnumerationViewModel
  tier: string | null
  description: string | null
}

export interface ProgramBudget {
  budgetLeft: MoneyViewModel | null
  budgetSpent: MoneyViewModel | null
  budgetInValidation: MoneyViewModel | null
  budgetTotal: MoneyViewModel | null
}

export interface ProgramDetailViewModel extends ProgramOverviewViewModel {
  description: string | null
  domains: DomainViewModel[]
  bounties: BountyViewModel[]
  programBudget: ProgramBudget | null
  skipTriage: boolean
  tacRequired: boolean
  awardRep: boolean
  allowResearcherCollaboration: boolean
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export interface SubmissionSeverityViewModel {
  id: number
  vector: string | null
  value: string
  score: number | null
}

export interface SubmissionStateViewModel {
  status: EnumerationViewModel
  closeReason: EnumerationViewModel | null
}

export interface SubmissionOriginators {
  programId: string | null
  pentestCode: string | null
}

export interface SubmissionOverviewViewModel {
  code: string
  title: string
  createdAt: number
  lastUpdatedAt: number | null
  awaitingFeedback: boolean
  destroyed: boolean
  collaboratorCount: number
  tags: string[] | null
  groupId: string | null
  originators: SubmissionOriginators
  internalReference: { reference: string | null; url: string | null } | null
  severity: SubmissionSeverityViewModel
  state: SubmissionStateViewModel
  totalPayout: MoneyViewModel | null
  assignee: CompanyUserViewModel | null
  submitter: ResearcherViewModel | null
  webLinks: { details: string }
}

export interface SubmissionRewardViewModel {
  totalPayout: MoneyViewModel | null
  totalBountyPayout: MoneyViewModel | null
  totalBonusPayout: MoneyViewModel | null
  possibleBounty: MoneyViewModel | null
  totalRetestBountyPayout: MoneyViewModel | null
}

export interface SubmissionReportViewModel {
  originalTitle: string | null
  type: { name: string | null; category: string | null; cwe: string | null } | null
  domain: DomainViewModel | null
  questions: Array<{ question: string; type: string; answer: string }> | null
  endpointVulnerableComponent: string | null
  pocDescription: string | null
  impact: string | null
  personalData: boolean
  recommendedSolution: string | null
  attachments: Array<{ url: string; code: string }> | null
  ip: string | null
}

export interface SubmissionDetailsViewModel extends SubmissionOverviewViewModel {
  report: SubmissionReportViewModel | null
  reward: SubmissionRewardViewModel | null
  attachmentCount: number
  integrationCount: number
  customFields: Array<{ key: string; value: string; type: string }> | null
  aiSummary: { status: string; summary: string | null; generatedAt: number | null } | null
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export interface PayoutOriginators {
  programId: string | null
  pentestCode: string | null
  submissionCode: string | null
  rewardRequestId: string | null
  retestId: string | null
}

export interface PayoutViewModel {
  id: string
  originators: PayoutOriginators
  amount: MoneyViewModel
  type: EnumerationViewModel
  researcher: ResearcherViewModel | null
  status: EnumerationViewModel
  createdAt: number
  paidAt: number | null
  lastUpdatedAt: number | null
}

// ─── Reward System ───────────────────────────────────────────────────────────

export interface RewardRequestOverviewViewModel {
  id: string
  title: string | null
  internalReference: string | null
  recipientEmail: string | null
  status: EnumerationViewModel
  isDeletable: boolean
  reward: {
    payout: {
      payoutId: string | null
      amount: MoneyViewModel
      severity: EnumerationViewModel | null
    }
  }
  createdBy: CompanyUserViewModel | null
  createdAt: number
  claimedBy: ResearcherViewModel | null
  claimedAt: number | null
  lastUpdatedAt: number
}

export interface PaginatedResponse<T> {
  count: number
  maxCount: number
  records: T[]
}

export interface RewardBudget {
  available: MoneyViewModel | null
  spent: MoneyViewModel | null
  total: MoneyViewModel | null
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiErrorModel {
  identifier: string
  title: string | null
  status: number
  code: string | null
  extraParameters: Record<string, string[]> | null
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly model: ApiErrorModel | null,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
