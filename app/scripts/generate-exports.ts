/**
 * Generates distributable JSON files for every built-in report module.
 * Run from the app/ directory:
 *   node_modules/.bin/esbuild scripts/generate-exports.ts --bundle --platform=node | node
 *
 * Output: ../exports/{platform}/{module-id}.rwce-module.json
 * sampleFixtureData is stripped (null) so the files stay lean for distribution.
 */
import * as fs from 'fs'
import * as path from 'path'

import { universalSeverityBreakdownSpec } from '../src/reports/universalSeverityBreakdown/spec'
import { universalVolumetrendSpec } from '../src/reports/universalVolumetrendByMonth/spec'
import { universalResolutionTimeSpec } from '../src/reports/universalResolutionTime/spec'
import { universalResearcherLeaderboardSpec } from '../src/reports/universalResearcherLeaderboard/spec'
import { dailyTriageMovementSpec } from '../src/reports/dailyTriageMovement/spec'
import { dailyTriageThroughputSpec } from '../src/reports/dailyTriageThroughput/spec'
import { weeklyTriageSummarySpec } from '../src/reports/weeklyTriageSummary/spec'
import { bountyBudgetOverviewSpec } from '../src/reports/bountyBudgetOverview/spec'
import { submissionStatusSnapshotSpec } from '../src/reports/submissionStatusSnapshot/spec'
import { rawApiExplorerSpec } from '../src/reports/rawApiExplorer/spec'
import { hackeroneReportsOverviewSpec } from '../src/reports/hackeroneReportsOverview/spec'
import { hackeroneActivitySpec } from '../src/reports/hackeroneActivity/spec'
import { bugcrowdEngagementOverviewSpec } from '../src/reports/bugcrowdEngagementOverview/spec'
import { bugcrowdSubmissionsSpec } from '../src/reports/bugcrowdSubmissions/spec'

const MODULES = [
  { folder: 'universal', spec: universalSeverityBreakdownSpec },
  { folder: 'universal', spec: universalVolumetrendSpec },
  { folder: 'universal', spec: universalResolutionTimeSpec },
  { folder: 'universal', spec: universalResearcherLeaderboardSpec },
  { folder: 'intigriti', spec: dailyTriageMovementSpec },
  { folder: 'intigriti', spec: dailyTriageThroughputSpec },
  { folder: 'intigriti', spec: weeklyTriageSummarySpec },
  { folder: 'intigriti', spec: bountyBudgetOverviewSpec },
  { folder: 'intigriti', spec: submissionStatusSnapshotSpec },
  { folder: 'intigriti', spec: rawApiExplorerSpec },
  { folder: 'hackerone', spec: hackeroneReportsOverviewSpec },
  { folder: 'hackerone', spec: hackeroneActivitySpec },
  { folder: 'bugcrowd', spec: bugcrowdEngagementOverviewSpec },
  { folder: 'bugcrowd', spec: bugcrowdSubmissionsSpec },
]

// __dirname resolves to app/ when bundled via esbuild from app/ CWD
const EXPORTS_DIR = path.resolve(__dirname, '../exports')

for (const { folder, spec } of MODULES) {
  const dir = path.join(EXPORTS_DIR, folder)
  fs.mkdirSync(dir, { recursive: true })
  const exportSpec = { ...spec, sampleFixtureData: null }
  const json = JSON.stringify(exportSpec, null, 2)
  const filename = `${spec.id}.rwce-module.json`
  fs.writeFileSync(path.join(dir, filename), json)
  console.log(`✓ ${folder}/${filename}`)
}

console.log(`\n${MODULES.length} modules exported to ${EXPORTS_DIR}`)
