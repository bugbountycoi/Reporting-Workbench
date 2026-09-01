import type { SubmissionOverviewViewModel } from '../../api/types'

// 14 days of submissions for the sample program
const BASE_TS = 1752192000 // ~2025-07-11

export const sampleSubmissions: SubmissionOverviewViewModel[] = Array.from({ length: 28 }, (_, i) => ({
  code: `SAMPLE-${i + 1}`,
  title: `Sample submission ${i + 1}`,
  createdAt: BASE_TS + Math.floor(i * 0.7) * 86400 + (i % 3) * 3600,
  lastUpdatedAt: BASE_TS + Math.floor(i * 0.7) * 86400 + 86400,
  awaitingFeedback: false,
  destroyed: false,
  collaboratorCount: 0,
  tags: null,
  groupId: null,
  originators: { programId: 'prog-alpha-001', pentestCode: null },
  internalReference: null,
  severity: { id: i % 4 + 1, vector: null, value: ['Low', 'Medium', 'High', 'Critical'][i % 4], score: null },
  state: {
    status: {
      id: [2, 3, 4, 5, 4][i % 5],
      value: ['Triage', 'Accepted', 'Closed', 'Forwarded to customer', 'Closed'][i % 5],
    },
    closeReason: [null, null, { id: 2, value: 'Not Applicable' }, null, { id: 1, value: 'Duplicate' }][i % 5],
  },
  totalPayout: i % 5 === 1 ? { value: 500 + i * 100, currency: 'USD' } : null,
  assignee: null,
  submitter: { userId: `res-${i}`, userName: `researcher${i}`, avatarUrl: null, role: null, ranking: { rank: i + 1, reputation: 1000 + i * 100, streak: { id: 2, value: 'Warm' } }, identityChecked: true },
  webLinks: { details: `https://app.intigriti.com/submissions/SAMPLE-${i + 1}` },
}))
