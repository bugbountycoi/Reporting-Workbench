import type { PlatformId } from '../types'
import type { CanonicalProgram, CanonicalSubmission, CanonicalPayout } from '../canonical'
import { adaptPrograms as igAdaptPrograms, adaptSubmissions as igAdaptSubmissions, adaptPayouts as igAdaptPayouts } from './intigriti'
import { adaptH1Programs, adaptH1Submissions, adaptH1Payouts } from './hackerone'
import type { H1Program, H1Report } from '../../api/endpoints/hackerone'
import { adaptBcEngagements, adaptBcSubmissions, adaptBcPayouts } from './bugcrowd'
import type { BugcrowdEngagement, BugcrowdSubmission } from '../../api/endpoints/bugcrowd'

export function adaptPrograms(platform: PlatformId, raw: unknown[]): CanonicalProgram[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptPrograms(raw as Parameters<typeof igAdaptPrograms>[0])
    case 'hackerone':
      return adaptH1Programs(raw as H1Program[])
    case 'bugcrowd':
      return adaptBcEngagements(raw as BugcrowdEngagement[])
  }
}

export function adaptSubmissions(platform: PlatformId, raw: unknown[], programId: string): CanonicalSubmission[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptSubmissions(raw as Parameters<typeof igAdaptSubmissions>[0], programId)
    case 'hackerone':
      return adaptH1Submissions(raw as H1Report[])
    case 'bugcrowd':
      return adaptBcSubmissions(raw as BugcrowdSubmission[])
  }
}

export function adaptPayouts(platform: PlatformId, raw: unknown[]): CanonicalPayout[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptPayouts(raw as Parameters<typeof igAdaptPayouts>[0])
    case 'hackerone':
      return adaptH1Payouts(raw as H1Report[])
    case 'bugcrowd':
      return adaptBcPayouts(raw as BugcrowdSubmission[])
  }
}
