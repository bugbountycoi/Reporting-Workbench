import type { PlatformId } from '../types'
import type { CanonicalProgram, CanonicalSubmission, CanonicalPayout } from '../canonical'
import { adaptPrograms as igAdaptPrograms, adaptSubmissions as igAdaptSubmissions, adaptPayouts as igAdaptPayouts } from './intigriti'

// HackerOne and Bugcrowd adapters are wired in Plans 2 and 3 respectively.
// Calling them before those plans are implemented throws a clear error.

export function adaptPrograms(platform: PlatformId, raw: unknown[]): CanonicalProgram[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptPrograms(raw as Parameters<typeof igAdaptPrograms>[0])
    case 'hackerone':
    case 'bugcrowd':
      throw new Error(`${platform} adapter not yet implemented`)
  }
}

export function adaptSubmissions(platform: PlatformId, raw: unknown[], programId: string): CanonicalSubmission[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptSubmissions(raw as Parameters<typeof igAdaptSubmissions>[0], programId)
    case 'hackerone':
    case 'bugcrowd':
      throw new Error(`${platform} adapter not yet implemented`)
  }
}

export function adaptPayouts(platform: PlatformId, raw: unknown[]): CanonicalPayout[] {
  switch (platform) {
    case 'intigriti':
      return igAdaptPayouts(raw as Parameters<typeof igAdaptPayouts>[0])
    case 'hackerone':
    case 'bugcrowd':
      throw new Error(`${platform} adapter not yet implemented`)
  }
}
