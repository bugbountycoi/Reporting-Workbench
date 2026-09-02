import type { GroupByKey, AggregationKey } from '../../reports/userModules/types'

export const GROUP_BY_OPTIONS: { value: GroupByKey; label: string; dataSources: string[] }[] = [
  { value: 'time.day', label: 'Day', dataSources: ['submissions', 'payouts'] },
  { value: 'time.week', label: 'Week', dataSources: ['submissions', 'payouts'] },
  { value: 'time.month', label: 'Month', dataSources: ['submissions', 'payouts'] },
  { value: 'severity', label: 'Severity', dataSources: ['submissions'] },
  { value: 'status', label: 'Status', dataSources: ['submissions'] },
  { value: 'closeReason', label: 'Close Reason', dataSources: ['submissions'] },
  { value: 'program', label: 'Program', dataSources: ['submissions', 'payouts'] },
  { value: 'researcher', label: 'Researcher', dataSources: ['submissions'] },
  { value: 'tag', label: 'Tag', dataSources: ['submissions'] },
  { value: 'payout.type', label: 'Payout Type', dataSources: ['payouts'] },
  { value: 'payout.status', label: 'Payout Status', dataSources: ['payouts'] },
]

export const AGGREGATION_OPTIONS: { value: AggregationKey; label: string; dataSources: string[] }[] = [
  { value: 'count', label: 'Count', dataSources: ['submissions', 'payouts', 'programs'] },
  { value: 'sum.bounty', label: 'Sum: Bounty', dataSources: ['submissions'] },
  { value: 'sum.payoutAmount', label: 'Sum: Payout Amount', dataSources: ['payouts'] },
  { value: 'avg.severityScore', label: 'Avg: Severity Score', dataSources: ['submissions'] },
  { value: 'countDistinct.researcher', label: 'Count Distinct: Researcher', dataSources: ['submissions'] },
]

export const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'none', label: 'No chart (table only)' },
] as const

export const CATEGORY_OPTIONS = [
  { value: 'triage', label: 'Triage' },
  { value: 'bounty', label: 'Bounty' },
  { value: 'snapshot', label: 'Snapshot' },
  { value: 'developer', label: 'Developer' },
] as const

export const DATA_SOURCE_OPTIONS = [
  { value: 'submissions', label: 'Submissions' },
  { value: 'payouts', label: 'Payouts' },
  { value: 'programs', label: 'Programs' },
] as const

export const DEFAULT_COLORS = [
  '#4C59A8', '#02A87C', '#F03157', '#E0AC00',
  '#7BCFDB', '#E99C4A', '#575865', '#A855F7',
]

export const STEPS = [
  'Basics',
  'Data Source',
  'Group & Metrics',
  'Visualization',
  'Table',
  'Preview & Save',
] as const

export type StepName = typeof STEPS[number]
