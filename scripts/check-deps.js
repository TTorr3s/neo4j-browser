#!/usr/bin/env node
import { execSync } from 'child_process'
import fs from 'fs'

const YEARS_THRESHOLD = Number(process.argv[2] ?? 4)
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 40)
const PACKAGE_JSON = 'package.json'

if (!fs.existsSync(PACKAGE_JSON)) {
  console.error('package.json not found')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'))

const deps = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {})
}

const sleep = ms =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

const now = Date.now()
const THRESHOLD_MS = YEARS_THRESHOLD * 365 * 24 * 60 * 60 * 1000

const stale = []
console.log('Checking dependencies starting...')

for (const [name, range] of Object.entries(deps)) {
  try {
    const version = range.replace(/^[^\d]*/, '')
    if (!version) continue

    const output = execSync(`npm view ${name} time --json`, {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString()

    const times = JSON.parse(output)
    const published = times[version]
    if (!published) continue

    const ageMs = now - new Date(published).getTime()

    if (ageMs > THRESHOLD_MS) {
      console.log(`Checking ${name}... WARN`)
      stale.push({
        package: name,
        version,
        published,
        ageYears: (ageMs / 3.154e10).toFixed(2)
      })
    } else {
      console.log(`Checking ${name}... OK`)
    }

    sleep(SLEEP_MS)
  } catch {
    sleep(SLEEP_MS)
  }
}

if (!stale.length) {
  console.log(`No dependencies older than ${YEARS_THRESHOLD} years`)
  process.exit(0)
}

// Order by ageYears descending (inmutable)
const sortedStale = [...stale].sort((a, b) => b.ageYears - a.ageYears)

console.log(`Dependencies older than ${YEARS_THRESHOLD} years:\n`)
console.table(sortedStale)
