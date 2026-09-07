import type { SubmissionOverviewViewModel } from '../../api/types'

// Sample data spanning 2024-01 through 2026-08, designed so the Daily Triage Throughput
// monthly chart shows realistic queue-depth dynamics:
//   - Accepted queue is the largest and growing throughout (~2× triage)
//   - Triage queue rises steadily as new submissions arrive (+80–120/month)
//   - Pending queue is smaller but visible, also rising (+50–75/month)
//   - All three series have distinct levels and clear upward slopes
//
// NOTE: submissions are spread across 2+ years; use monthly interval over 2024–2026
// to see the best chart. The daily view of a 2-week window will look nearly flat.

const DAY = 86400
const EPOCH_2024_01_01 = 1704067200 // 2024-01-01 00:00:00 UTC

const ts = (dayOffset: number, hour = 8): number =>
  EPOCH_2024_01_01 + dayOffset * DAY + hour * 3600

type CloseReason = { id: number; value: string } | null

function sub(
  idx: number,
  code: string,
  created: number,
  updated: number,
  statusId: number,
  statusValue: string,
  closeReason: CloseReason,
  sev: string,
  bounty: number | null,
): SubmissionOverviewViewModel {
  const sevIndex = ['Low', 'Medium', 'High', 'Critical'].indexOf(sev)
  return {
    code,
    title: `Sample submission ${code}`,
    createdAt: created,
    lastUpdatedAt: updated,
    awaitingFeedback: false,
    destroyed: false,
    collaboratorCount: 0,
    tags: null,
    groupId: null,
    originators: { programId: 'prog-alpha-001', pentestCode: null },
    internalReference: null,
    severity: { id: sevIndex + 1, vector: null, value: sev, score: null },
    state: { status: { id: statusId, value: statusValue }, closeReason },
    totalPayout: bounty ? { value: bounty, currency: 'USD' } : null,
    assignee: null,
    submitter: {
      userId: `res-${idx}`,
      userName: `researcher${idx}`,
      avatarUrl: null,
      role: null,
      ranking: { rank: idx + 1, reputation: 1000 + idx * 50, streak: { id: 2, value: 'Warm' } },
      identityChecked: true,
    },
    webLinks: { details: `https://app.intigriti.com/submissions/${code}` },
  }
}

const NA  = { id: 2, value: 'Not Applicable' }
const DUP = { id: 1, value: 'Duplicate' }
const RES = { id: 3, value: 'Resolved' }

// Helper: day offset from 2024-01-01.
// month is 1-based (Jan=1). day is 1-based day of month.
// Approximated as (month-1)*30 + day - 1 for simplicity; close enough for display.
function d(month: number, day: number, year: 2024 | 2025 | 2026 = 2024): number {
  const yearOffset = (year - 2024) * 365
  return yearOffset + (month - 1) * 30 + (day - 1)
}

// Build the fixture:
// ~120 submissions created Jan 2024 – Aug 2026 with realistic state distribution.
// Each group's lastUpdatedAt is set to approximate the quarter when the submission
// was processed, creating visible monthly queue-depth movement.

export const sampleSubmissions: SubmissionOverviewViewModel[] = [
  // ── 2024 Q1: 18 new, 12 accepted (transition ~Q2), 6 closed (transition ~Q2) ──
  sub( 1, 'S001', ts(d(1,5)),  ts(d(4,10)), 3, 'Accepted', null, 'Critical', 2500),
  sub( 2, 'S002', ts(d(1,12)), ts(d(4,20)), 3, 'Accepted', null, 'High',     900),
  sub( 3, 'S003', ts(d(1,20)), ts(d(5, 5)), 3, 'Accepted', null, 'High',     800),
  sub( 4, 'S004', ts(d(2, 3)), ts(d(5,15)), 3, 'Accepted', null, 'Medium',   400),
  sub( 5, 'S005', ts(d(2,15)), ts(d(6,10)), 3, 'Accepted', null, 'Critical', 1800),
  sub( 6, 'S006', ts(d(2,22)), ts(d(6,25)), 3, 'Accepted', null, 'High',     750),
  sub( 7, 'S007', ts(d(3, 1)), ts(d(7, 8)), 3, 'Accepted', null, 'Medium',   350),
  sub( 8, 'S008', ts(d(3,10)), ts(d(7,20)), 3, 'Accepted', null, 'High',     900),
  sub( 9, 'S009', ts(d(3,18)), ts(d(8, 5)), 3, 'Accepted', null, 'Critical', 2200),
  sub(10, 'S010', ts(d(3,25)), ts(d(8,18)), 3, 'Accepted', null, 'High',     1000),
  sub(11, 'S011', ts(d(1,8)),  ts(d(4,15)), 3, 'Accepted', null, 'Medium',   500),
  sub(12, 'S012', ts(d(2,8)),  ts(d(5,22)), 3, 'Accepted', null, 'High',     850),
  sub(13, 'S013', ts(d(1,15)), ts(d(4, 5)), 4, 'Closed', NA,  'Low',    null),
  sub(14, 'S014', ts(d(1,25)), ts(d(5, 2)), 4, 'Closed', DUP, 'Low',    null),
  sub(15, 'S015', ts(d(2,18)), ts(d(5,20)), 4, 'Closed', NA,  'Medium', null),
  sub(16, 'S016', ts(d(3, 5)), ts(d(6,12)), 4, 'Closed', DUP, 'Low',    null),
  sub(17, 'S017', ts(d(3,12)), ts(d(7, 1)), 4, 'Closed', RES, 'High',   1100),
  sub(18, 'S018', ts(d(3,20)), ts(d(7,15)), 4, 'Closed', NA,  'Low',    null),

  // Forwarded/Pending (transition ~Q2-Q3)
  sub(19, 'S019', ts(d(1,10)), ts(d(4,25)), 5, 'Forwarded to customer', null, 'High',     null),
  sub(20, 'S020', ts(d(2,10)), ts(d(5,12)), 5, 'Forwarded to customer', null, 'Critical', null),
  sub(21, 'S021', ts(d(3, 8)), ts(d(6,20)), 5, 'Forwarded to customer', null, 'Medium',   null),

  // Still in Triage (always-triage from Q1 2024)
  sub(22, 'S022', ts(d(1,18)), ts(d(1,2026)), 2, 'Triage', null, 'High',   null),
  sub(23, 'S023', ts(d(2,25)), ts(d(1,2026)), 2, 'Triage', null, 'Medium', null),
  sub(24, 'S024', ts(d(3,15)), ts(d(1,2026)), 2, 'Triage', null, 'Low',    null),

  // ── 2024 Q2: 18 new, 12 accepted (transition ~Q3), 6 closed ────────────
  sub(25, 'S025', ts(d(4, 5)),  ts(d(7,15)), 3, 'Accepted', null, 'Critical', 3000),
  sub(26, 'S026', ts(d(4,15)),  ts(d(7,25)), 3, 'Accepted', null, 'High',     1100),
  sub(27, 'S027', ts(d(4,25)),  ts(d(8, 8)), 3, 'Accepted', null, 'Medium',    450),
  sub(28, 'S028', ts(d(5, 5)),  ts(d(8,20)), 3, 'Accepted', null, 'High',      950),
  sub(29, 'S029', ts(d(5,15)),  ts(d(9, 5)), 3, 'Accepted', null, 'Critical', 2000),
  sub(30, 'S030', ts(d(5,25)),  ts(d(9,18)), 3, 'Accepted', null, 'High',      800),
  sub(31, 'S031', ts(d(6, 5)),  ts(d(10,8)), 3, 'Accepted', null, 'Medium',    400),
  sub(32, 'S032', ts(d(6,15)),  ts(d(10,20)),3, 'Accepted', null, 'High',      875),
  sub(33, 'S033', ts(d(6,25)),  ts(d(11,5)), 3, 'Accepted', null, 'Critical', 2400),
  sub(34, 'S034', ts(d(4,10)),  ts(d(7,20)), 3, 'Accepted', null, 'High',     1050),
  sub(35, 'S035', ts(d(5,10)),  ts(d(8,15)), 3, 'Accepted', null, 'Medium',    380),
  sub(36, 'S036', ts(d(6,10)),  ts(d(9,25)), 3, 'Accepted', null, 'High',      920),
  sub(37, 'S037', ts(d(4,20)),  ts(d(7, 5)), 4, 'Closed', NA,  'Low',    null),
  sub(38, 'S038', ts(d(5, 2)),  ts(d(8,12)), 4, 'Closed', DUP, 'Low',    null),
  sub(39, 'S039', ts(d(5,20)),  ts(d(9, 2)), 4, 'Closed', NA,  'Medium', null),
  sub(40, 'S040', ts(d(6, 2)),  ts(d(9,22)), 4, 'Closed', DUP, 'Low',    null),
  sub(41, 'S041', ts(d(6,18)),  ts(d(10,5)), 4, 'Closed', RES, 'High',   1300),
  sub(42, 'S042', ts(d(6,28)),  ts(d(10,18)),4, 'Closed', NA,  'Low',    null),

  sub(43, 'S043', ts(d(4,12)),  ts(d(7,22)), 5, 'Forwarded to customer', null, 'Medium',   null),
  sub(44, 'S044', ts(d(5,12)),  ts(d(8,28)), 5, 'Forwarded to customer', null, 'High',     null),
  sub(45, 'S045', ts(d(6,12)),  ts(d(9,15)), 5, 'Forwarded to customer', null, 'Critical', null),

  sub(46, 'S046', ts(d(4,28)),  ts(d(1,2026)), 2, 'Triage', null, 'High',   null),
  sub(47, 'S047', ts(d(5,28)),  ts(d(1,2026)), 2, 'Triage', null, 'Medium', null),
  sub(48, 'S048', ts(d(6,28)),  ts(d(1,2026)), 2, 'Triage', null, 'Critical', null),

  // ── 2024 Q3: 12 accepted (transition ~Q4/Q1-2025), 6 closed, 3 pending ──
  sub(49, 'S049', ts(d(7, 5)),  ts(d(10,15)), 3, 'Accepted', null, 'High',     1000),
  sub(50, 'S050', ts(d(7,18)),  ts(d(11, 5)), 3, 'Accepted', null, 'Critical', 2800),
  sub(51, 'S051', ts(d(8, 2)),  ts(d(11,20)), 3, 'Accepted', null, 'Medium',    420),
  sub(52, 'S052', ts(d(8,15)),  ts(d(12, 8)), 3, 'Accepted', null, 'High',      980),
  sub(53, 'S053', ts(d(9, 1)),  ts(d(12,22)), 3, 'Accepted', null, 'Critical', 2100),
  sub(54, 'S054', ts(d(9,15)),  ts(d(1,10,2025)), 3, 'Accepted', null, 'High',  880),
  sub(55, 'S055', ts(d(7,12)),  ts(d(10,25)), 3, 'Accepted', null, 'Medium',    460),
  sub(56, 'S056', ts(d(8, 8)),  ts(d(11,12)), 3, 'Accepted', null, 'High',      940),
  sub(57, 'S057', ts(d(9, 5)),  ts(d(12,15)), 3, 'Accepted', null, 'Critical', 2300),
  sub(58, 'S058', ts(d(9,22)),  ts(d(1,22,2025)), 3, 'Accepted', null, 'High',  820),
  sub(59, 'S059', ts(d(7,25)),  ts(d(11,28)), 3, 'Accepted', null, 'Medium',    390),
  sub(60, 'S060', ts(d(8,25)),  ts(d(12,28)), 3, 'Accepted', null, 'High',      960),

  sub(61, 'S061', ts(d(7,10)),  ts(d(10,20)), 4, 'Closed', NA,  'Low',    null),
  sub(62, 'S062', ts(d(7,28)),  ts(d(11,15)), 4, 'Closed', DUP, 'Medium', null),
  sub(63, 'S063', ts(d(8,18)),  ts(d(12, 5)), 4, 'Closed', NA,  'Low',    null),
  sub(64, 'S064', ts(d(9, 8)),  ts(d(12,20)), 4, 'Closed', DUP, 'Low',    null),
  sub(65, 'S065', ts(d(9,20)),  ts(d(1,15,2025)), 4, 'Closed', RES, 'High', 1400),
  sub(66, 'S066', ts(d(9,28)),  ts(d(1,28,2025)), 4, 'Closed', NA,  'Low',  null),

  sub(67, 'S067', ts(d(7,15)),  ts(d(10,28)), 5, 'Forwarded to customer', null, 'High',   null),
  sub(68, 'S068', ts(d(8,20)),  ts(d(11,25)), 5, 'Forwarded to customer', null, 'Critical',null),
  sub(69, 'S069', ts(d(9,10)),  ts(d(12,18)), 5, 'Forwarded to customer', null, 'Medium', null),

  sub(70, 'S070', ts(d(7,22)),  ts(d(1,2026)), 2, 'Triage', null, 'High',   null),
  sub(71, 'S071', ts(d(8,28)),  ts(d(1,2026)), 2, 'Triage', null, 'Low',    null),
  sub(72, 'S072', ts(d(9,25)),  ts(d(1,2026)), 2, 'Triage', null, 'Medium', null),

  // ── 2024 Q4: similar pattern, transition into 2025 ─────────────────────
  sub(73, 'S073', ts(d(10, 5)), ts(d(2,15,2025)), 3, 'Accepted', null, 'Critical', 2600),
  sub(74, 'S074', ts(d(10,20)), ts(d(3, 5,2025)), 3, 'Accepted', null, 'High',      920),
  sub(75, 'S075', ts(d(11, 5)), ts(d(3,20,2025)), 3, 'Accepted', null, 'Medium',    430),
  sub(76, 'S076', ts(d(11,20)), ts(d(4, 8,2025)), 3, 'Accepted', null, 'High',      870),
  sub(77, 'S077', ts(d(12, 5)), ts(d(4,22,2025)), 3, 'Accepted', null, 'Critical', 2200),
  sub(78, 'S078', ts(d(12,20)), ts(d(5,10,2025)), 3, 'Accepted', null, 'High',      810),
  sub(79, 'S079', ts(d(10,12)), ts(d(2,28,2025)), 3, 'Accepted', null, 'Medium',    470),
  sub(80, 'S080', ts(d(11,12)), ts(d(3,28,2025)), 3, 'Accepted', null, 'High',      950),
  sub(81, 'S081', ts(d(12,12)), ts(d(4,28,2025)), 3, 'Accepted', null, 'Critical', 2400),

  sub(82, 'S082', ts(d(10,18)), ts(d(2,20,2025)), 4, 'Closed', NA,  'Low',    null),
  sub(83, 'S083', ts(d(11,18)), ts(d(3,15,2025)), 4, 'Closed', DUP, 'Medium', null),
  sub(84, 'S084', ts(d(12,18)), ts(d(4,18,2025)), 4, 'Closed', NA,  'Low',    null),

  sub(85, 'S085', ts(d(10,25)), ts(d(3,10,2025)), 5, 'Forwarded to customer', null, 'High',     null),
  sub(86, 'S086', ts(d(11,25)), ts(d(4,15,2025)), 5, 'Forwarded to customer', null, 'Critical', null),
  sub(87, 'S087', ts(d(12,25)), ts(d(5,20,2025)), 5, 'Forwarded to customer', null, 'Medium',   null),

  sub(88, 'S088', ts(d(10,28)), ts(d(1,2026)), 2, 'Triage', null, 'High',     null),
  sub(89, 'S089', ts(d(11,28)), ts(d(1,2026)), 2, 'Triage', null, 'Medium',   null),
  sub(90, 'S090', ts(d(12,28)), ts(d(1,2026)), 2, 'Triage', null, 'Critical', null),

  // ── 2025 H1: continuing growth ──────────────────────────────────────────
  sub(91,  'S091', ts(d(1,10,2025)), ts(d(5,25,2025)), 3, 'Accepted', null, 'Critical', 2900),
  sub(92,  'S092', ts(d(2, 5,2025)), ts(d(6,15,2025)), 3, 'Accepted', null, 'High',     1050),
  sub(93,  'S093', ts(d(3,10,2025)), ts(d(7,10,2025)), 3, 'Accepted', null, 'Medium',    480),
  sub(94,  'S094', ts(d(4, 8,2025)), ts(d(8, 5,2025)), 3, 'Accepted', null, 'High',      990),
  sub(95,  'S095', ts(d(5,12,2025)), ts(d(9, 2,2025)), 3, 'Accepted', null, 'Critical', 2500),
  sub(96,  'S096', ts(d(6,15,2025)), ts(d(10,8,2025)), 3, 'Accepted', null, 'High',      830),

  sub(97,  'S097', ts(d(1,20,2025)), ts(d(6, 5,2025)), 4, 'Closed', NA,  'Low',    null),
  sub(98,  'S098', ts(d(3,20,2025)), ts(d(7,20,2025)), 4, 'Closed', DUP, 'Medium', null),
  sub(99,  'S099', ts(d(5,25,2025)), ts(d(9,15,2025)), 4, 'Closed', NA,  'Low',    null),

  sub(100, 'S100', ts(d(2,15,2025)), ts(d(7, 5,2025)), 5, 'Forwarded to customer', null, 'High',   null),
  sub(101, 'S101', ts(d(4,20,2025)), ts(d(9,10,2025)), 5, 'Forwarded to customer', null, 'Critical',null),
  sub(102, 'S102', ts(d(6,25,2025)), ts(d(11,5,2025)), 5, 'Forwarded to customer', null, 'Medium', null),

  sub(103, 'S103', ts(d(1,28,2025)), ts(d(1,2026)), 2, 'Triage', null, 'High',   null),
  sub(104, 'S104', ts(d(3,28,2025)), ts(d(1,2026)), 2, 'Triage', null, 'Medium', null),
  sub(105, 'S105', ts(d(5,28,2025)), ts(d(1,2026)), 2, 'Triage', null, 'Critical', null),

  // ── 2025 H2 + 2026: still arriving, not yet resolved ───────────────────
  sub(106, 'S106', ts(d(7,10,2025)),  ts(d(12,20,2025)), 3, 'Accepted', null, 'Critical', 3100),
  sub(107, 'S107', ts(d(8,15,2025)),  ts(d(1,15,2026)), 3, 'Accepted', null, 'High',     1100),
  sub(108, 'S108', ts(d(9,20,2025)),  ts(d(2,10,2026)), 3, 'Accepted', null, 'Medium',    500),
  sub(109, 'S109', ts(d(10,10,2025)), ts(d(3, 5,2026)), 3, 'Accepted', null, 'High',     1000),
  sub(110, 'S110', ts(d(11,15,2025)), ts(d(4,12,2026)), 3, 'Accepted', null, 'Critical', 2700),
  sub(111, 'S111', ts(d(12,20,2025)), ts(d(5,18,2026)), 3, 'Accepted', null, 'High',      850),
  sub(112, 'S112', ts(d(1,15,2026)),  ts(d(6,10,2026)), 3, 'Accepted', null, 'Medium',    520),
  sub(113, 'S113', ts(d(2,20,2026)),  ts(d(7,15,2026)), 3, 'Accepted', null, 'High',     1020),
  sub(114, 'S114', ts(d(3,25,2026)),  ts(d(8,20,2026)), 3, 'Accepted', null, 'Critical', 2800),

  sub(115, 'S115', ts(d(7,25,2025)),  ts(d(12,28,2025)), 4, 'Closed', DUP, 'Low',    null),
  sub(116, 'S116', ts(d(9,28,2025)),  ts(d(2,28,2026)), 4, 'Closed', NA,  'Medium', null),
  sub(117, 'S117', ts(d(11,28,2025)), ts(d(4,25,2026)), 4, 'Closed', RES, 'High',   1500),
  sub(118, 'S118', ts(d(2,10,2026)),  ts(d(6,25,2026)), 4, 'Closed', DUP, 'Low',    null),

  sub(119, 'S119', ts(d(8,20,2025)),  ts(d(1,25,2026)), 5, 'Forwarded to customer', null, 'High',     null),
  sub(120, 'S120', ts(d(10,25,2025)), ts(d(3,20,2026)), 5, 'Forwarded to customer', null, 'Critical', null),
  sub(121, 'S121', ts(d(12,28,2025)), ts(d(5,25,2026)), 5, 'Forwarded to customer', null, 'Medium',   null),
  sub(122, 'S122', ts(d(3,10,2026)),  ts(d(8,10,2026)), 5, 'Forwarded to customer', null, 'High',     null),

  sub(123, 'S123', ts(d(7,28,2025)),  ts(d(1,2026)), 2, 'Triage', null, 'High',   null),
  sub(124, 'S124', ts(d(9,28,2025)),  ts(d(1,2026)), 2, 'Triage', null, 'Medium', null),
  sub(125, 'S125', ts(d(11,28,2025)), ts(d(1,2026)), 2, 'Triage', null, 'Critical', null),
  sub(126, 'S126', ts(d(1,28,2026)),  ts(d(1,2027)), 2, 'Triage', null, 'High',   null),
  sub(127, 'S127', ts(d(3,28,2026)),  ts(d(1,2027)), 2, 'Triage', null, 'Medium', null),
  sub(128, 'S128', ts(d(5,28,2026)),  ts(d(1,2027)), 2, 'Triage', null, 'Low',    null),
  sub(129, 'S129', ts(d(7,15,2026)),  ts(d(1,2027)), 2, 'Triage', null, 'Critical', null),
  sub(130, 'S130', ts(d(8,15,2026)),  ts(d(1,2027)), 2, 'Triage', null, 'High',   null),
]
