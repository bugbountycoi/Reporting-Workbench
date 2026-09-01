#!/usr/bin/env node
'use strict'
// scripts/generate-fixtures.js
// Generates realistic mock fixture data for all four sample files.
// Run: node scripts/generate-fixtures.js

const fs = require('fs')
const path = require('path')

// ── Seeded deterministic random (LCG) ────────────────────────────────────────
let _seed = 0xdeadbeef
function rng() {
  _seed = (Math.imul(1664525, _seed) + 1013904223) >>> 0
  return _seed / 0xffffffff
}
function randInt(lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)) }
function pick(arr) { return arr[Math.floor(rng() * arr.length)] }
function pickWeighted(items) {
  const total = items.reduce((a, x) => a + x.weight, 0)
  let r = rng() * total
  for (const x of items) { r -= x.weight; if (r <= 0) return x }
  return items[items.length - 1]
}
function jitter(n, pct = 0.25) {
  return Math.max(1, Math.round(n * (1 + (rng() * 2 - 1) * pct)))
}

// ── Timestamps ────────────────────────────────────────────────────────────────
const NOW_TS = 1756684800 // 2025-09-01 00:00 UTC

function monthStartTs(monthsAgo) {
  const d = new Date(NOW_TS * 1000)
  d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0)
  d.setUTCMonth(d.getUTCMonth() - monthsAgo)
  return Math.floor(d.getTime() / 1000)
}

function randDayInMonth(monthsAgo) {
  const start = monthStartTs(monthsAgo)
  const daysInMonth = new Date(new Date(start * 1000).getUTCFullYear(),
    new Date(start * 1000).getUTCMonth() + 1, 0).getUTCDate()
  return start + randInt(0, daysInMonth - 1) * 86400 + randInt(0, 86399)
}

// ── Content pools ─────────────────────────────────────────────────────────────
const VULN_TITLES = [
  'SQL injection in login endpoint',
  'Stored XSS in user profile page',
  'IDOR on /api/users/{id}',
  'SSRF via image upload URL',
  'Authentication bypass via JWT algorithm confusion',
  'Open redirect on logout flow',
  'Path traversal in file download',
  'Rate limiting missing on password reset',
  'Privilege escalation via role parameter tampering',
  'Reflected XSS in search query parameter',
  'CSRF on account email change',
  'Missing authentication on admin endpoint',
  'Race condition in balance withdrawal',
  'Sensitive data in API error response',
  'XXE injection in XML import endpoint',
  'Remote code execution via deserialization',
  'Mass assignment vulnerability in profile update',
  'Clickjacking on account settings',
  'Subdomain takeover on dev.example.com',
  'Information disclosure in stack trace',
  'Insecure file upload — executables allowed',
  'Business logic: negative quantity credits account',
  'Cache poisoning via unkeyed header',
  'GraphQL introspection enabled in production',
  'API key exposed in client-side JavaScript',
  'CORS misconfiguration allows arbitrary origin',
  'Session token not invalidated on logout',
  'Session fixation in login flow',
  'Host header injection in password reset link',
  'LDAP injection in directory search',
  'Server-side template injection in email subject',
  'NoSQL injection in MongoDB query filter',
  'Unvalidated redirect in OAuth callback',
  'Timing attack on HMAC token comparison',
  'Hardcoded credentials in mobile application',
  'Prototype pollution via JSON merge',
  'DOM-based XSS in SPA routing',
  'HTTP request smuggling via CL.TE discrepancy',
  'Blind SSRF via PDF generation service',
  'Second-order SQL injection in profile page',
  'Account enumeration via distinct error messages',
  'Missing rate limit on OTP verification',
  'Cross-site WebSocket hijacking',
  'Insecure direct object reference on invoice PDF',
  'Command injection in diagnostic ping utility',
  'Directory listing on /uploads endpoint',
  'Weak password recovery questions',
  'Account takeover via expired reset token reuse',
  'XPath injection in XML search endpoint',
  'Unsafe regex — ReDoS in input validation',
  'Missing HSTS header on login page',
  'Weak randomness in session token generation',
  'Type juggling authentication bypass (PHP)',
  'GraphQL batch query abuse — DoS vector',
  'Insecure cryptographic storage (MD5)',
  'Broken function-level authorization on admin API',
  'Missing object-level authorization on /api/reports',
  'Email header injection in contact form',
  'Self-XSS escalated via CSRF chain',
  'Credential stuffing — no lockout after failures',
]

const TAGS_POOL = [
  'sqli', 'xss', 'idor', 'ssrf', 'csrf', 'auth-bypass', 'path-traversal', 'rce',
  'xxe', 'open-redirect', 'info-disclosure', 'privilege-escalation', 'race-condition',
  'mass-assignment', 'injection', 'cors', 'jwt', 'subdomain-takeover', 'business-logic',
  'cache-poisoning', 'graphql', 'api-security', 'websocket', 'deserialization',
  'nosql', 'ldap', 'template-injection', 'clickjacking', 'regex', 'crypto',
]

const RESEARCHER_NAMES = [
  'hacker42', 'securefox', 'pentester99', 'vulnfinder', 'bugzapper', 'testmaster',
  'csrfpro', 'sqlninja', 'xsshunter', 'r3dteam', 'bountyhawk', 'secresearcher',
  'whitehat99', 'ethicalhack3r', 'vulndiscoverer', 'zeroday101', 'h4ck3r_pro',
  'sec_samurai', 'ghosthunter', 'shadowfox', 'cybercat', 'nullbyte', 'shellshock',
  'bytebuster', 'packethunter', 'netrecon', 'webreaper', 'apibuster', 'logicbomb',
  'tokenhunter', 'cookiecrumbler', 'headerhopper', 'injector99', 'bypasser',
  'escalator', 'fuzzer42', 'recon_king', 'osint_master', 'burpsuiter', 'autorize_fan',
  'payloadcraft', 'nmap_pro', 'masscan_fan', 'repeater42', 'scorpion_sec',
  'dragonfox', 'ironclad99', 'neonbug', 'staticnull', 'darkbyte', 'redshift_sec',
  'cryptobreaker', 'priv_esc', 'blind_sqler', 'idor_hunter', 'ssrf_master',
  'xss_king', 'rce_lord', 'auth_bypass', 'cors_checker', 'jwt_cracker',
  'race_winner', 'logic_bomber', 'template_injector', 'subdomain_taker',
]

// Pre-build 300 researcher profiles
const RESEARCHERS = Array.from({ length: 300 }, (_, i) => {
  const base = RESEARCHER_NAMES[i % RESEARCHER_NAMES.length]
  const suffix = i >= RESEARCHER_NAMES.length ? Math.floor(i / RESEARCHER_NAMES.length) : ''
  const streakId = randInt(1, 4)
  return {
    userId: `res-${String(i).padStart(4, '0')}`,
    userName: base + (suffix || ''),
    avatarUrl: null,
    role: null,
    ranking: {
      rank: randInt(1, 150),
      reputation: randInt(50, 18000),
      streak: { id: streakId, value: ['Cold', 'Warm', 'Hot', 'Legendary'][streakId - 1] },
    },
    identityChecked: rng() > 0.35,
  }
})

// ── Program definitions ───────────────────────────────────────────────────────
// Sizes: tiny, small, medium, large, x-large, xx-large
// peakRate: current submissions/month
// startRate: submissions/month when program launched
// monthsSpan: how many months of history
const PROGRAM_DEFS = [
  {
    id: 'prog-tiny-001',    handle: 'tinystartup-vdp',
    companyHandle: 'tinystartup', companyId: 'comp-001',
    name: 'TinyStartup VDP',
    typeId: 2, typeVal: 'VDP', isVdp: true,
    confId: 1, confVal: 'Public',
    budget: null,
    monthsSpan: 3, peakRate: 38, startRate: 30,
  },
  {
    id: 'prog-pixelpay-002', handle: 'pixelpay-bb',
    companyHandle: 'pixelpay', companyId: 'comp-002',
    name: 'PixelPay Bug Bounty',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 2, confVal: 'Responsible Disclosure',
    budget: { total: 50000, spent: 22000, inValidation: 1500 },
    monthsSpan: 10, peakRate: 62, startRate: 28,
  },
  {
    id: 'prog-stream-003',   handle: 'streamfusion-bb',
    companyHandle: 'streamfusion', companyId: 'comp-003',
    name: 'StreamFusion Platform',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 2, confVal: 'Responsible Disclosure',
    budget: { total: 120000, spent: 58000, inValidation: 4000 },
    monthsSpan: 20, peakRate: 88, startRate: 32,
  },
  {
    id: 'prog-cloudforge-004', handle: 'cloudforge-saas',
    companyHandle: 'cloudforge', companyId: 'comp-004',
    name: 'CloudForge SaaS',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 2, confVal: 'Responsible Disclosure',
    budget: { total: 300000, spent: 148000, inValidation: 9000 },
    monthsSpan: 28, peakRate: 118, startRate: 40,
  },
  {
    id: 'prog-govsecure-005', handle: 'govsecure-vdp',
    companyHandle: 'govsecure', companyId: 'comp-005',
    name: 'GovSecure VDP',
    typeId: 2, typeVal: 'VDP', isVdp: true,
    confId: 1, confVal: 'Public',
    budget: null,
    monthsSpan: 36, peakRate: 152, startRate: 48,
  },
  {
    id: 'prog-nexbank-006',  handle: 'nexbank-financial',
    companyHandle: 'nexbank', companyId: 'comp-006',
    name: 'NexBank Financial',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 3, confVal: 'Private',
    budget: { total: 1000000, spent: 524000, inValidation: 38000 },
    monthsSpan: 48, peakRate: 182, startRate: 52,
  },
  {
    id: 'prog-megashop-007', handle: 'megashop-global',
    companyHandle: 'megashop', companyId: 'comp-007',
    name: 'MegaShop Global',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 2, confVal: 'Responsible Disclosure',
    budget: { total: 2500000, spent: 1620000, inValidation: 92000 },
    monthsSpan: 72, peakRate: 238, startRate: 65,
  },
  {
    id: 'prog-quantum-008', handle: 'quantumcore-enterprise',
    companyHandle: 'quantumcore', companyId: 'comp-008',
    name: 'QuantumCore Enterprise',
    typeId: 1, typeVal: 'Bug Bounty', isVdp: false,
    confId: 3, confVal: 'Private',
    budget: { total: 8000000, spent: 5150000, inValidation: 295000 },
    monthsSpan: 120, peakRate: 298, startRate: 32,
  },
]

// Sigmoid interpolation: smooth S-curve growth from startRate to peakRate
function interpolateRate(monthIdx, totalMonths, startRate, peakRate) {
  if (totalMonths <= 1) return peakRate
  const t = monthIdx / (totalMonths - 1) // 0..1 (0=oldest, 1=newest)
  const s = 1 / (1 + Math.exp(-8 * (t - 0.5))) // sigmoid centered at 0.5
  return Math.round(startRate + (peakRate - startRate) * s)
}

// ── Status pools ──────────────────────────────────────────────────────────────
const STATUS_POOL_BB = [
  { status: { id: 1, value: 'New' },                   closeReason: null,                              weight: 7 },
  { status: { id: 2, value: 'Triage' },                closeReason: null,                              weight: 11 },
  { status: { id: 5, value: 'Forwarded to customer' }, closeReason: null,                              weight: 5 },
  { status: { id: 3, value: 'Accepted' },              closeReason: null,                              weight: 24 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 1, value: 'Duplicate' },     weight: 16 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 2, value: 'Not Applicable' }, weight: 17 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 3, value: 'Informative' },   weight: 11 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 4, value: 'Resolved' },      weight: 9 },
]
const STATUS_POOL_VDP = [
  { status: { id: 1, value: 'New' },                   closeReason: null,                              weight: 8 },
  { status: { id: 2, value: 'Triage' },                closeReason: null,                              weight: 10 },
  { status: { id: 5, value: 'Forwarded to customer' }, closeReason: null,                              weight: 18 },
  { status: { id: 3, value: 'Accepted' },              closeReason: null,                              weight: 15 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 1, value: 'Duplicate' },     weight: 18 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 2, value: 'Not Applicable' }, weight: 18 },
  { status: { id: 4, value: 'Closed' },                closeReason: { id: 3, value: 'Informative' },   weight: 13 },
]

// Severity pool — Critical is rarer
const SEVERITY_POOL = [
  { id: 5, value: 'Informational', score: 0.0,  weight: 8  },
  { id: 1, value: 'Low',           score: 3.1,  weight: 22 },
  { id: 2, value: 'Medium',        score: 5.5,  weight: 37 },
  { id: 3, value: 'High',          score: 7.8,  weight: 25 },
  { id: 4, value: 'Critical',      score: 9.5,  weight: 8  },
]

// Bounty amount ranges by severity (USD)
const BOUNTY_RANGES = {
  Critical:      [3000, 60000],
  High:          [500,  12000],
  Medium:        [200,   3000],
  Low:           [75,     600],
  Informational: [0,       0],
}

function bountyAmount(sevVal, budgetTotal) {
  const [lo, hi] = BOUNTY_RANGES[sevVal] || [0, 0]
  if (!lo && !hi) return null
  const scale = budgetTotal ? Math.min(3.0, budgetTotal / 500000) : 0.4
  const raw = lo + rng() * (hi - lo)
  const amount = Math.round(raw * scale / 50) * 50
  return amount > 0 ? { value: amount, currency: 'USD' } : null
}

// ── Generate programs fixture ─────────────────────────────────────────────────
function buildPrograms() {
  return PROGRAM_DEFS.map(p => {
    const result = {
      id: p.id,
      handle: p.handle,
      companyId: p.companyId,
      companyHandle: p.companyHandle,
      logoUrl: null,
      name: p.name,
      status: { id: 1, value: 'Open' },
      confidentialityLevel: { id: p.confId, value: p.confVal },
      type: { id: p.typeId, value: p.typeVal },
      webLinks: { details: `https://app.intigriti.com/programs/${p.companyHandle}/${p.handle}/detail` },
    }
    if (p.budget) {
      result.programBudget = {
        budgetLeft:         { value: p.budget.total - p.budget.spent, currency: 'USD' },
        budgetSpent:        { value: p.budget.spent, currency: 'USD' },
        budgetInValidation: { value: p.budget.inValidation, currency: 'USD' },
        budgetTotal:        { value: p.budget.total, currency: 'USD' },
      }
    } else {
      result.programBudget = null
    }
    return result
  })
}

// ── Generate submissions fixture ──────────────────────────────────────────────
function buildSubmissions() {
  const submissions = []
  let globalIdx = 1

  for (const prog of PROGRAM_DEFS) {
    // monthIdx 0 = oldest, monthsSpan-1 = most recent
    for (let m = 0; m < prog.monthsSpan; m++) {
      const monthsAgo = prog.monthsSpan - 1 - m
      const rate = interpolateRate(m, prog.monthsSpan, prog.startRate, prog.peakRate)
      const count = jitter(rate, 0.22)

      for (let i = 0; i < count; i++) {
        const code = `INT-S-${String(globalIdx).padStart(6, '0')}`
        globalIdx++

        const createdAt = randDayInMonth(monthsAgo)
        const hoursLater = randInt(1, 72)
        const lastUpdatedAt = createdAt + hoursLater * 3600 + randInt(0, 3599)

        const sev = pickWeighted(SEVERITY_POOL)
        const statePool = prog.isVdp ? STATUS_POOL_VDP : STATUS_POOL_BB
        const stateEntry = pickWeighted(statePool)
        const state = { status: stateEntry.status, closeReason: stateEntry.closeReason }

        // Only accepted BB submissions get payouts
        const isPaidStatus = !prog.isVdp && state.status.value === 'Accepted'
        const payout = isPaidStatus ? bountyAmount(sev.value, prog.budget?.total) : null

        const researcher = RESEARCHERS[randInt(0, RESEARCHERS.length - 1)]
        const tagCount = Math.floor(rng() * 2.5)
        const tags = Array.from(new Set(Array.from({ length: tagCount }, () => pick(TAGS_POOL))))

        // Awaiting feedback: ~15% chance for open statuses
        const awaitingFeedback = ['New', 'Triage', 'Forwarded to customer'].includes(state.status.value)
          && rng() < 0.15

        submissions.push({
          code,
          title: pick(VULN_TITLES),
          createdAt,
          lastUpdatedAt,
          awaitingFeedback,
          destroyed: false,
          collaboratorCount: rng() < 0.06 ? randInt(1, 3) : 0,
          tags,
          groupId: null,
          originators: { programId: prog.id, pentestCode: null },
          internalReference: null,
          severity: { id: sev.id, vector: null, value: sev.value, score: sev.score },
          state,
          totalPayout: payout,
          assignee: null,
          submitter: researcher,
          webLinks: { details: `https://app.intigriti.com/submissions/${code}` },
        })
      }
    }
  }

  return submissions
}

// ── Generate payouts fixture ──────────────────────────────────────────────────
function buildPayouts(submissions) {
  const payouts = []
  let payIdx = 1

  for (const sub of submissions) {
    if (!sub.totalPayout) continue
    const paid = rng() > 0.2 // 80% already paid, 20% pending
    const paidAt = paid ? sub.createdAt + randInt(3, 21) * 86400 : null

    payouts.push({
      id: `pay-${String(payIdx).padStart(6, '0')}`,
      payIdx,
      originators: {
        programId: sub.originators.programId,
        pentestCode: null,
        submissionCode: sub.code,
        rewardRequestId: null,
        retestId: null,
      },
      amount: sub.totalPayout,
      type: { id: 1, value: 'Bounty' },
      researcher: sub.submitter,
      status: { id: paid ? 2 : 1, value: paid ? 'Paid' : 'Pending' },
      createdAt: sub.createdAt + randInt(1, 5) * 86400,
      paidAt,
      lastUpdatedAt: paidAt ?? (sub.createdAt + randInt(1, 5) * 86400),
    })
    payIdx++
  }

  return payouts
}

// ── Generate reward requests fixture ─────────────────────────────────────────
function buildRewardRequests(submissions) {
  // Only a small subset of accepted submissions have reward requests
  const accepted = submissions.filter(s => s.state.status.value === 'Accepted' && s.totalPayout && rng() < 0.12)
  return accepted.slice(0, 200).map((sub, i) => ({
    id: `rr-${String(i + 1).padStart(5, '0')}`,
    originators: {
      programId: sub.originators.programId,
      submissionCode: sub.code,
      pentestCode: null,
    },
    amount: sub.totalPayout,
    status: { id: randInt(1, 3), value: pick(['Pending', 'Approved', 'Paid']) },
    researcher: sub.submitter,
    createdAt: sub.createdAt + randInt(2, 10) * 86400,
    lastUpdatedAt: sub.lastUpdatedAt,
  }))
}

// ── Write files ───────────────────────────────────────────────────────────────
const FIXTURES_DIR = path.join(__dirname, '..', 'app', 'public', 'fixtures')

console.log('Generating fixtures...')

const programs    = buildPrograms()
const submissions = buildSubmissions()
const payouts     = buildPayouts(submissions)
const rewardReqs  = buildRewardRequests(submissions)

const files = [
  { name: 'programs.sample.json',        data: programs },
  { name: 'submissions.sample.json',     data: submissions },
  { name: 'payouts.sample.json',         data: payouts },
  { name: 'rewardRequests.sample.json',  data: rewardReqs },
]

for (const { name, data } of files) {
  const filePath = path.join(FIXTURES_DIR, name)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0))
  const bytes = fs.statSync(filePath).size
  const kb = (bytes / 1024).toFixed(0)
  console.log(`  ${name.padEnd(35)} ${String(data.length).padStart(6)} records  ${kb} KB`)
}

console.log('\nDone.')
console.log(`  Programs: ${programs.length}`)
console.log(`  Submissions: ${submissions.length}`)
console.log(`  Payouts: ${payouts.length}`)
console.log(`  Reward requests: ${rewardReqs.length}`)

// Summary by program
console.log('\nSubmissions by program:')
for (const p of programs) {
  const count = submissions.filter(s => s.originators.programId === p.id).length
  const def = PROGRAM_DEFS.find(d => d.id === p.id)
  console.log(`  ${p.name.padEnd(30)} ${String(count).padStart(6)} subs  (${def.monthsSpan}mo, peak ${def.peakRate}/mo)`)
}
