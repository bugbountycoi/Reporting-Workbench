import { dailyTriageMovement } from './dailyTriageMovement'
import { weeklyTriageSummary } from './weeklyTriageSummary'
import { bountyBudgetOverview } from './bountyBudgetOverview'
import { submissionStatusSnapshot } from './submissionStatusSnapshot'
import { rawApiExplorer } from './rawApiExplorer'
import type { ReportModule, AppContext } from './types'

const ALL_MODULES: ReportModule[] = [
  dailyTriageMovement,
  weeklyTriageSummary,
  bountyBudgetOverview,
  submissionStatusSnapshot,
  rawApiExplorer,
]

export function getAvailableReports(ctx: AppContext): ReportModule[] {
  return ALL_MODULES.filter((m) => {
    try {
      return m.isAvailable(ctx)
    } catch {
      return false
    }
  })
}

export function getReportById(id: string): ReportModule | undefined {
  return ALL_MODULES.find((m) => m.id === id)
}
