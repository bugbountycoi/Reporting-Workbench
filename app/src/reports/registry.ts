import type { ReportModule, AppContext } from './types'
import type { UserModuleSpec } from './userModules/types'
import { specToModule } from './userModules/interpreter'
import { loadUserModuleSpecs } from './userModules/store'

import { dailyTriageMovementSpec } from './dailyTriageMovement/spec'
import { weeklyTriageSummarySpec } from './weeklyTriageSummary/spec'
import { bountyBudgetOverviewSpec } from './bountyBudgetOverview/spec'
import { submissionStatusSnapshotSpec } from './submissionStatusSnapshot/spec'
import { rawApiExplorerSpec } from './rawApiExplorer/spec'
import { hackeroneReportsOverviewSpec } from './hackeroneReportsOverview/spec'
import { hackeroneActivitySpec } from './hackeroneActivity/spec'
import { bugcrowdEngagementOverviewSpec } from './bugcrowdEngagementOverview/spec'
import { bugcrowdSubmissionsSpec } from './bugcrowdSubmissions/spec'

const BUILT_IN_SPECS: UserModuleSpec[] = [
  dailyTriageMovementSpec,
  weeklyTriageSummarySpec,
  bountyBudgetOverviewSpec,
  submissionStatusSnapshotSpec,
  rawApiExplorerSpec,
  hackeroneReportsOverviewSpec,
  hackeroneActivitySpec,
  bugcrowdEngagementOverviewSpec,
  bugcrowdSubmissionsSpec,
]

function buildModules(ctx: AppContext): ReportModule[] {
  const { programs } = ctx

  const builtIn = BUILT_IN_SPECS.map((spec) => {
    const mod = specToModule(spec, programs)
    mod.isBuiltIn = true
    return mod
  })

  const userSpecs = loadUserModuleSpecs()
  const userModules = userSpecs.map((spec) => specToModule(spec, programs))

  return [...builtIn, ...userModules]
}

export function getAvailableReports(ctx: AppContext): ReportModule[] {
  return buildModules(ctx).filter((m) => {
    try {
      return m.isAvailable(ctx)
    } catch {
      return false
    }
  })
}

export function getReportById(id: string, ctx: AppContext): ReportModule | undefined {
  return buildModules(ctx).find((m) => m.id === id)
}

export function getSpecById(id: string): UserModuleSpec | undefined {
  const builtIn = BUILT_IN_SPECS.find((s) => s.id === id)
  if (builtIn) return builtIn
  return loadUserModuleSpecs().find((s) => s.id === id)
}
