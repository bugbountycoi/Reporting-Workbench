import type { CanonicalSubmission } from '../platforms/canonical'

// Canonical fixture data for universal (cross-platform) module previews.
// Represents the shape returned by ctx.getSubmissions() — not a platform-specific format.
//
// 120 submissions across 2024-01 – 2026-08.
// Distribution:
//   Severity — critical 10%, high 28%, medium 37%, low 20%, informational 5%
//   State    — resolved 45%, triaged 22%, closed 14%, invalid 12%, duplicate 7%
// Designed so all four universal charts (severity breakdown, volume trend,
// resolution time, researcher leaderboard) show visually distinct, realistic output.

const D = 86400          // seconds per day
const EPOCH = 1704067200 // 2024-01-01 00:00:00 UTC

function ts(dayOffset: number, hourOffset = 8): number {
  return EPOCH + dayOffset * D + hourOffset * 3600
}

type Sev = CanonicalSubmission['severity']
type St  = CanonicalSubmission['state']

const HANDLES = [
  'alice_vuln',     // heavy submitter
  'bob_sec',        // heavy submitter
  'charlie_0day',
  'dana_idor',
  'eve_xss',
  'felix_sqli',
  'grace_rce',
  'henry_ssrf',
  'iris_crypto',
  'jack_bypass',
  'kate_recon',
  'liam_cloud',
]

function sub(
  n: number,
  sev: Sev,
  state: St,
  created: number,
  ttaDays: number | null,   // time-to-action: days until updatedAt (null = not yet)
  handleIdx: number,
  payout: number | null,
): CanonicalSubmission {
  return {
    id: `univ-${String(n).padStart(3, '0')}`,
    platform: 'intigriti',
    programId: 'prog-alpha-001',
    title: `${sev.charAt(0).toUpperCase() + sev.slice(1)} issue #${n}`,
    severity: sev,
    state,
    submittedAt: created,
    updatedAt: ttaDays !== null ? created + ttaDays * D : null,
    payoutAmount: payout,
    payoutCurrency: payout !== null ? 'USD' : null,
    researcherHandle: HANDLES[handleIdx % HANDLES.length],
    url: null,
  }
}

export const universalFixtures: CanonicalSubmission[] = [
  // ── 2024 Jan-Feb ────────────────────────────────────────────────────────
  sub(  1, 'critical', 'resolved',     ts(  5),  3,  0, 3200),
  sub(  2, 'high',     'resolved',     ts( 10), 12,  1,  950),
  sub(  3, 'medium',   'closed',       ts( 12), 18,  2, null),
  sub(  4, 'high',     'triaged',      ts( 20), null,3, null),
  sub(  5, 'medium',   'resolved',     ts( 25), 22,  4,  420),
  sub(  6, 'low',      'invalid',      ts( 30),  8,  5, null),
  sub(  7, 'high',     'resolved',     ts( 38),  9,  0,  880),

  // ── 2024 Mar-Apr ────────────────────────────────────────────────────────
  sub(  8, 'critical', 'resolved',     ts( 62),  4,  1, 2800),
  sub(  9, 'high',     'duplicate',    ts( 68),  5,  6, null),
  sub( 10, 'medium',   'triaged',      ts( 72), null,2, null),
  sub( 11, 'low',      'closed',       ts( 80), 14,  7, null),
  sub( 12, 'high',     'resolved',     ts( 88), 16,  3,  910),
  sub( 13, 'medium',   'invalid',      ts( 95),  6,  4, null),
  sub( 14, 'high',     'resolved',     ts(100), 20,  8,  840),
  sub( 15, 'low',      'resolved',     ts(108), 25, 9, null),

  // ── 2024 May-Jun ────────────────────────────────────────────────────────
  sub( 16, 'critical', 'resolved',     ts(122),  6,  0, 4100),
  sub( 17, 'medium',   'triaged',      ts(128), null,5, null),
  sub( 18, 'high',     'resolved',     ts(134), 18,  1,  990),
  sub( 19, 'low',      'duplicate',    ts(140),  4, 10, null),
  sub( 20, 'medium',   'resolved',     ts(148), 28,  2,  380),
  sub( 21, 'high',     'triaged',      ts(155), null,3, null),
  sub( 22, 'informational','closed',   ts(160), 10,  6, null),
  sub( 23, 'high',     'resolved',     ts(168), 22,  4,  870),

  // ── 2024 Jul-Aug ────────────────────────────────────────────────────────
  sub( 24, 'critical', 'resolved',     ts(182),  5,  1, 3500),
  sub( 25, 'high',     'resolved',     ts(188), 14,  0,  920),
  sub( 26, 'medium',   'invalid',      ts(195),  7,  7, null),
  sub( 27, 'medium',   'triaged',      ts(200), null,5, null),
  sub( 28, 'high',     'duplicate',    ts(208),  6,  2, null),
  sub( 29, 'low',      'resolved',     ts(214), 30, 11, null),
  sub( 30, 'medium',   'resolved',     ts(220), 19,  8,  450),
  sub( 31, 'high',     'resolved',     ts(228), 11,  3,  860),
  sub( 32, 'low',      'closed',       ts(235), 20,  9, null),

  // ── 2024 Sep-Oct ────────────────────────────────────────────────────────
  sub( 33, 'critical', 'triaged',      ts(245), null,0, null),
  sub( 34, 'high',     'resolved',     ts(252), 15,  1,  970),
  sub( 35, 'medium',   'resolved',     ts(258), 24,  4,  410),
  sub( 36, 'low',      'invalid',      ts(265),  9,  6, null),
  sub( 37, 'high',     'triaged',      ts(272), null,5, null),
  sub( 38, 'medium',   'closed',       ts(278), 16,  2, null),
  sub( 39, 'high',     'resolved',     ts(285), 18,  3,  900),
  sub( 40, 'informational','closed',   ts(290), 12,  7, null),
  sub( 41, 'medium',   'duplicate',    ts(296),  5, 10, null),

  // ── 2024 Nov-Dec ────────────────────────────────────────────────────────
  sub( 42, 'critical', 'resolved',     ts(308),  7,  1, 2900),
  sub( 43, 'high',     'resolved',     ts(314), 20,  0,  940),
  sub( 44, 'medium',   'triaged',      ts(320), null,4, null),
  sub( 45, 'low',      'resolved',     ts(325), 35, 11, null),
  sub( 46, 'high',     'resolved',     ts(332), 13,  2,  860),
  sub( 47, 'medium',   'invalid',      ts(338),  8,  8, null),
  sub( 48, 'high',     'duplicate',    ts(344),  4,  5, null),
  sub( 49, 'low',      'closed',       ts(350), 22,  9, null),
  sub( 50, 'medium',   'resolved',     ts(356), 26,  3,  390),
  sub( 51, 'high',     'resolved',     ts(362), 17,  6,  880),

  // ── 2025 Jan-Feb ────────────────────────────────────────────────────────
  sub( 52, 'critical', 'resolved',     ts(368),  3,  0, 5200),
  sub( 53, 'high',     'triaged',      ts(374), null,1, null),
  sub( 54, 'medium',   'resolved',     ts(380), 21,  4,  440),
  sub( 55, 'low',      'duplicate',    ts(386),  6, 10, null),
  sub( 56, 'high',     'resolved',     ts(392), 15,  2,  960),
  sub( 57, 'medium',   'closed',       ts(398), 18,  7, null),
  sub( 58, 'high',     'resolved',     ts(404), 12,  3,  910),
  sub( 59, 'informational','triaged',  ts(410), null,5, null),
  sub( 60, 'low',      'invalid',      ts(414),  9,  6, null),
  sub( 61, 'high',     'resolved',     ts(420), 19,  8,  890),

  // ── 2025 Mar-Apr ────────────────────────────────────────────────────────
  sub( 62, 'critical', 'resolved',     ts(428),  5,  1, 3100),
  sub( 63, 'high',     'resolved',     ts(434), 16,  0,  950),
  sub( 64, 'medium',   'triaged',      ts(440), null,4, null),
  sub( 65, 'low',      'resolved',     ts(446), 40, 11, null),
  sub( 66, 'high',     'duplicate',    ts(452),  7,  2, null),
  sub( 67, 'medium',   'resolved',     ts(458), 23,  5,  460),
  sub( 68, 'high',     'triaged',      ts(464), null,3, null),
  sub( 69, 'medium',   'invalid',      ts(470), 10,  9, null),
  sub( 70, 'high',     'resolved',     ts(476), 14,  6,  930),
  sub( 71, 'low',      'closed',       ts(482), 17,  7, null),

  // ── 2025 May-Jun ────────────────────────────────────────────────────────
  sub( 72, 'critical', 'triaged',      ts(488), null,0, null),
  sub( 73, 'high',     'resolved',     ts(494), 11,  1,  980),
  sub( 74, 'medium',   'resolved',     ts(500), 27,  4,  420),
  sub( 75, 'high',     'resolved',     ts(506), 18,  8,  900),
  sub( 76, 'low',      'invalid',      ts(512),  5, 10, null),
  sub( 77, 'medium',   'triaged',      ts(518), null,2, null),
  sub( 78, 'high',     'duplicate',    ts(524),  8,  5, null),
  sub( 79, 'medium',   'closed',       ts(530), 20,  3, null),
  sub( 80, 'critical', 'resolved',     ts(536),  6, 11, 2600),
  sub( 81, 'high',     'resolved',     ts(542), 13,  6,  870),

  // ── 2025 Jul-Aug ────────────────────────────────────────────────────────
  sub( 82, 'medium',   'resolved',     ts(548), 25,  4,  470),
  sub( 83, 'high',     'triaged',      ts(554), null,7, null),
  sub( 84, 'low',      'resolved',     ts(560), 45, 11, null),
  sub( 85, 'high',     'resolved',     ts(566), 16,  0,  960),
  sub( 86, 'medium',   'invalid',      ts(572),  7,  9, null),
  sub( 87, 'critical', 'resolved',     ts(578),  4,  1, 3800),
  sub( 88, 'high',     'resolved',     ts(584), 10,  2,  920),
  sub( 89, 'medium',   'triaged',      ts(590), null,5, null),
  sub( 90, 'low',      'closed',       ts(596), 14,  8, null),

  // ── 2025 Sep-Oct ────────────────────────────────────────────────────────
  sub( 91, 'high',     'resolved',     ts(608), 20,  3,  940),
  sub( 92, 'medium',   'duplicate',    ts(614),  6, 10, null),
  sub( 93, 'critical', 'triaged',      ts(620), null,0, null),
  sub( 94, 'high',     'triaged',      ts(626), null,1, null),
  sub( 95, 'low',      'invalid',      ts(630),  9,  6, null),
  sub( 96, 'medium',   'resolved',     ts(636), 22,  4,  400),
  sub( 97, 'high',     'resolved',     ts(642), 15,  7,  910),
  sub( 98, 'medium',   'closed',       ts(648), 18,  2, null),

  // ── 2025 Nov-Dec ────────────────────────────────────────────────────────
  sub( 99, 'critical', 'resolved',     ts(660),  5,  1, 4200),
  sub(100, 'high',     'resolved',     ts(666), 12,  0,  970),
  sub(101, 'medium',   'triaged',      ts(672), null,5, null),
  sub(102, 'low',      'resolved',     ts(678), 38, 11, null),
  sub(103, 'high',     'duplicate',    ts(684),  7,  3, null),
  sub(104, 'medium',   'resolved',     ts(690), 24,  8,  430),
  sub(105, 'informational','closed',   ts(696), 13,  9, null),
  sub(106, 'high',     'resolved',     ts(702), 17,  2,  900),

  // ── 2026 Jan-Feb ────────────────────────────────────────────────────────
  sub(107, 'critical', 'resolved',     ts(730),  4,  0, 3600),
  sub(108, 'high',     'triaged',      ts(736), null,1, null),
  sub(109, 'medium',   'resolved',     ts(742), 20,  4,  450),
  sub(110, 'high',     'resolved',     ts(748), 13,  7,  950),
  sub(111, 'low',      'invalid',      ts(752),  8, 10, null),
  sub(112, 'medium',   'triaged',      ts(758), null,2, null),
  sub(113, 'high',     'resolved',     ts(764), 16,  5,  920),
  sub(114, 'low',      'closed',       ts(770), 19,  6, null),

  // ── 2026 Mar-Apr ────────────────────────────────────────────────────────
  sub(115, 'critical', 'triaged',      ts(790), null,1, null),
  sub(116, 'high',     'resolved',     ts(796), 14,  0,  980),
  sub(117, 'medium',   'resolved',     ts(802), 26,  3,  410),
  sub(118, 'high',     'duplicate',    ts(808),  5,  8, null),
  sub(119, 'medium',   'triaged',      ts(814), null,4, null),
  sub(120, 'high',     'resolved',     ts(820), 11,  2,  930),
]
