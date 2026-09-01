#!/usr/bin/env node
'use strict'
// scripts/validate-fixtures.js
// Validates fixture JSON files against the expected API shape.
// Exits with code 1 on any mismatch — used to block release builds.
// Run: node scripts/validate-fixtures.js

const fs = require('fs')
const path = require('path')

const FIXTURES_DIR = path.join(__dirname, '..', 'app', 'public', 'fixtures')

const errors = []

function check(label, condition, msg) {
  if (!condition) errors.push(`[${label}] ${msg}`)
}

const isNum  = (v) => typeof v === 'number' && isFinite(v)
const isStr  = (v) => typeof v === 'string'
const isObj  = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isEnum = (v) => isObj(v) && isNum(v.id) && isStr(v.value)
const isMoney = (v) => isObj(v) && isNum(v.value) && isStr(v.currency)

function loadJson(filename) {
  const filePath = path.join(FIXTURES_DIR, filename)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    console.error(`Failed to load ${filename}: ${e.message}`)
    process.exit(1)
  }
}

// ── Programs ──────────────────────────────────────────────────────────────────
const programs = loadJson('programs.sample.json')
if (!Array.isArray(programs)) {
  errors.push('[programs] Root must be an array')
} else {
  for (const [i, p] of programs.entries()) {
    const lbl = `programs[${i}]`
    check(lbl, isStr(p.id),            'id must be string')
    check(lbl, isStr(p.handle),        'handle must be string')
    check(lbl, isStr(p.companyId),     'companyId must be string')
    check(lbl, isStr(p.companyHandle), 'companyHandle must be string')
    check(lbl, p.logoUrl === null || isStr(p.logoUrl), 'logoUrl must be string or null')
    check(lbl, isStr(p.name),          'name must be string')
    check(lbl, isEnum(p.status),       'status must be {id: number, value: string}')
    check(lbl, isEnum(p.confidentialityLevel), 'confidentialityLevel must be {id, value}')
    check(lbl, isEnum(p.type),         'type must be {id: number, value: string}')
    check(lbl, isObj(p.webLinks) && isStr(p.webLinks.details), 'webLinks.details must be string')
    if (p.programBudget !== null) {
      const b = p.programBudget
      check(lbl, isObj(b), 'programBudget must be object or null')
      if (isObj(b)) {
        check(lbl, b.budgetLeft   === null || isMoney(b.budgetLeft),   'programBudget.budgetLeft must be money or null')
        check(lbl, b.budgetSpent  === null || isMoney(b.budgetSpent),  'programBudget.budgetSpent must be money or null')
        check(lbl, b.budgetTotal  === null || isMoney(b.budgetTotal),  'programBudget.budgetTotal must be money or null')
      }
    }
  }
}

// ── Submissions ───────────────────────────────────────────────────────────────
const submissions = loadJson('submissions.sample.json')
if (!Array.isArray(submissions)) {
  errors.push('[submissions] Root must be an array')
} else {
  for (const [i, s] of submissions.entries()) {
    const lbl = `submissions[${i}]`
    check(lbl, isStr(s.code),  'code must be string')
    check(lbl, isStr(s.title), 'title must be string')
    check(lbl, isNum(s.createdAt), 'createdAt must be unix timestamp (number)')
    check(lbl, s.lastUpdatedAt === null || isNum(s.lastUpdatedAt), 'lastUpdatedAt must be number or null')
    check(lbl, typeof s.awaitingFeedback === 'boolean', 'awaitingFeedback must be boolean')
    check(lbl, typeof s.destroyed === 'boolean', 'destroyed must be boolean')
    check(lbl, isNum(s.collaboratorCount), 'collaboratorCount must be number')
    check(lbl, s.tags === null || Array.isArray(s.tags), 'tags must be string[] or null')
    // originators
    check(lbl, isObj(s.originators), 'originators must be object')
    if (isObj(s.originators)) {
      check(lbl, s.originators.programId === null || isStr(s.originators.programId),
        'originators.programId must be string or null')
      check(lbl, s.originators.pentestCode === null || isStr(s.originators.pentestCode),
        'originators.pentestCode must be string or null')
    }
    // severity
    check(lbl, isObj(s.severity), 'severity must be object')
    if (isObj(s.severity)) {
      check(lbl, isNum(s.severity.id),    'severity.id must be number')
      check(lbl, isStr(s.severity.value), 'severity.value must be string')
      check(lbl, s.severity.score === null || isNum(s.severity.score), 'severity.score must be number or null')
      check(lbl, s.severity.vector === null || isStr(s.severity.vector), 'severity.vector must be string or null')
    }
    // state
    check(lbl, isObj(s.state), 'state must be object')
    if (isObj(s.state)) {
      check(lbl, isEnum(s.state.status), 'state.status must be {id, value}')
      check(lbl, s.state.closeReason === null || isEnum(s.state.closeReason),
        'state.closeReason must be {id, value} or null')
    }
    // totalPayout
    check(lbl, s.totalPayout === null || isMoney(s.totalPayout),
      'totalPayout must be {value: number, currency: string} or null')
    // webLinks
    check(lbl, isObj(s.webLinks) && isStr(s.webLinks.details), 'webLinks.details must be string')
  }
}

// ── Payouts ───────────────────────────────────────────────────────────────────
const payouts = loadJson('payouts.sample.json')
if (!Array.isArray(payouts)) {
  errors.push('[payouts] Root must be an array')
} else {
  for (const [i, p] of payouts.entries()) {
    const lbl = `payouts[${i}]`
    check(lbl, isStr(p.id), 'id must be string')
    check(lbl, isObj(p.originators), 'originators must be object')
    if (isObj(p.originators)) {
      check(lbl, p.originators.programId === null || isStr(p.originators.programId),
        'originators.programId must be string or null')
      check(lbl, p.originators.submissionCode === null || isStr(p.originators.submissionCode),
        'originators.submissionCode must be string or null')
      check(lbl, p.originators.pentestCode === null || isStr(p.originators.pentestCode),
        'originators.pentestCode must be string or null')
    }
    check(lbl, isMoney(p.amount), 'amount must be {value: number, currency: string}')
    check(lbl, isEnum(p.type),    'type must be {id, value}')
    check(lbl, isEnum(p.status),  'status must be {id, value}')
    check(lbl, isNum(p.createdAt), 'createdAt must be unix timestamp (number)')
    check(lbl, p.paidAt === null || isNum(p.paidAt), 'paidAt must be number or null')
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  const shown = errors.slice(0, 50)
  console.error(`\nFixture validation FAILED — ${errors.length} error${errors.length !== 1 ? 's' : ''}:`)
  for (const e of shown) console.error(`  ${e}`)
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`)
  process.exit(1)
}

const total = programs.length + submissions.length + payouts.length
console.log(`Fixture validation passed — ${programs.length} programs, ${submissions.length} submissions, ${payouts.length} payouts (${total} total records).`)
