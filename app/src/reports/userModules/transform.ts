/**
 * Declarative transform engine for user-defined report modules.
 * Implements the group-by + aggregate + sort pipeline described by UserModuleSpec.
 */
import type { ReportData, SummaryCard } from '../types'
import type { UserModuleSpec, GroupByKey, AggregationKey } from './types'
import { bucketKey } from '../../utils/intervals'
import { daysBetween } from '../../utils/dates'
import type { SubmissionOverviewViewModel, PayoutViewModel, ProgramOverviewViewModel } from '../../api/types'

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>

function getGroupKey(item: AnyRecord, groupBy: GroupByKey, programs: ProgramOverviewViewModel[]): string {
  switch (groupBy) {
    case 'time.day':
      return bucketKey(item.createdAt as number, 'day')
    case 'time.week':
      return bucketKey(item.createdAt as number, 'week')
    case 'time.month':
      return bucketKey(item.createdAt as number, 'month')
    case 'severity': {
      const s = item as unknown as SubmissionOverviewViewModel
      return s.severity?.value ?? 'Unknown'
    }
    case 'status': {
      const s = item as unknown as SubmissionOverviewViewModel
      return s.state?.status?.value ?? 'Unknown'
    }
    case 'closeReason': {
      const s = item as unknown as SubmissionOverviewViewModel
      return s.state?.closeReason?.value ?? 'None'
    }
    case 'program': {
      const s = item as unknown as SubmissionOverviewViewModel
      const pid = s.originators?.programId ?? ''
      return programs.find((p) => p.id === pid)?.name ?? pid ?? 'Unknown'
    }
    case 'researcher': {
      const s = item as unknown as SubmissionOverviewViewModel
      return s.submitter?.userName ?? 'Anonymous'
    }
    case 'tag': {
      const s = item as unknown as SubmissionOverviewViewModel
      return (s.tags ?? []).join(', ') || 'Untagged'
    }
    case 'payout.type': {
      const p = item as unknown as PayoutViewModel
      return p.type?.value ?? 'Unknown'
    }
    case 'payout.status': {
      const p = item as unknown as PayoutViewModel
      return p.status?.value ?? 'Unknown'
    }
    default:
      return 'Unknown'
  }
}

// ---------------------------------------------------------------------------
// Metric computation
// ---------------------------------------------------------------------------

function computeMetric(items: AnyRecord[], aggregation: AggregationKey): number {
  if (items.length === 0) return 0
  switch (aggregation) {
    case 'count':
      return items.length
    case 'sum.bounty': {
      let total = 0
      for (const item of items) {
        const s = item as unknown as SubmissionOverviewViewModel
        total += s.totalPayout?.value ?? 0
      }
      return total
    }
    case 'sum.payoutAmount': {
      let total = 0
      for (const item of items) {
        const p = item as unknown as PayoutViewModel
        total += p.amount?.value ?? 0
      }
      return total
    }
    case 'avg.severityScore': {
      const scored = (items as unknown as SubmissionOverviewViewModel[]).filter(
        (s) => s.severity?.score != null,
      )
      if (scored.length === 0) return 0
      return Math.round((scored.reduce((sum, s) => sum + (s.severity.score ?? 0), 0) / scored.length) * 10) / 10
    }
    case 'countDistinct.researcher': {
      const names = new Set(
        (items as unknown as SubmissionOverviewViewModel[]).map((s) => s.submitter?.userName ?? ''),
      )
      return names.size
    }
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Summary card derivation
// ---------------------------------------------------------------------------

function deriveSummaryCardValue(
  spec: UserModuleSpec,
  allItems: AnyRecord[],
  valueKey: string,
): string | number {
  switch (valueKey) {
    case 'total.count':
      return allItems.length
    case 'total.bounty': {
      const total = (allItems as unknown as SubmissionOverviewViewModel[]).reduce(
        (s, x) => s + (x.totalPayout?.value ?? 0),
        0,
      )
      return total
    }
    case 'avg.severityScore':
      return computeMetric(allItems as AnyRecord[], 'avg.severityScore')
    case 'pct.accepted': {
      const accepted = (allItems as unknown as SubmissionOverviewViewModel[]).filter(
        (s) => s.state?.status?.value === 'Accepted',
      ).length
      return allItems.length > 0 ? `${Math.round((accepted / allItems.length) * 100)}%` : '0%'
    }
    case 'countDistinct.researcher':
      return computeMetric(allItems as AnyRecord[], 'countDistinct.researcher')
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Main declarative transform
// ---------------------------------------------------------------------------

export function declarativeTransform(
  raw: unknown,
  params: Record<string, unknown>,
  programs: ProgramOverviewViewModel[],
  spec: UserModuleSpec,
): ReportData {
  const items = (Array.isArray(raw) ? raw : [raw]) as AnyRecord[]

  // Filter by program if programIds is in params
  const programIds = (params.programIds as string[] | undefined) ?? []
  const filtered =
    spec.params.includePrograms && programIds.length > 0
      ? items.filter((item) => {
          const s = item as unknown as SubmissionOverviewViewModel
          return programIds.includes(s.originators?.programId ?? '')
        })
      : items

  // Group
  const groups = new Map<string, AnyRecord[]>()
  for (const item of filtered) {
    const key = getGroupKey(item, spec.groupBy, programs)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // Build rows
  const groupKey = spec.groupBy.replace('time.', '').replace('payout.', '')
  let rows = [...groups.entries()].map(([groupVal, groupItems]) => {
    const row: AnyRecord = { [groupKey]: groupVal }
    for (const metric of spec.metrics) {
      row[metric.key] = computeMetric(groupItems, metric.aggregation)
    }
    return row
  })

  // Sort
  const { key: sortKey, dir } = spec.sortBy
  rows.sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av
    }
    const as = String(av ?? '')
    const bs = String(bv ?? '')
    return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
  })

  // Summary cards
  const summaryCards: SummaryCard[] = spec.summaryCards.map((cardDef) => ({
    label: cardDef.label,
    value: deriveSummaryCardValue(spec, filtered, cardDef.value),
    trend: cardDef.trend ?? undefined,
  }))

  return {
    rows,
    chartData: rows,
    summaryCards,
    rawData: raw,
  }
}

// Re-export helpers for use in customTransform ctx
export { bucketKey, daysBetween }
