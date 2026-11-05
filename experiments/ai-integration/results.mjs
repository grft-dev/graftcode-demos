/**
 * Load runs and summarize REST against Graftcode.
 *
 * A technology counts when at least 80% of its runs pass acceptance and at least 3 passing
 * runs reported token usage. Missing usage is never treated as zero. Medians use passing runs.
 * Runs are compared only when the model and prompt match.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (!sorted.length) return null
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function walkRuns(dir, found = []) {
  if (!existsSync(dir)) return found
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walkRuns(path, found)
    else if (name === 'runs.json') found.push(path)
  }
  return found
}

function load(dir) {
  const latest = new Map()
  for (const path of walkRuns(dir)) {
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    const template = String(doc.prompt ?? '').replaceAll(doc.tech, '{TECH}')
    const key = `${doc.model}::${template}::${doc.arm}`
    if (!latest.has(key) || path > latest.get(key).source) {
      latest.set(key, { ...doc, template, source: path, runs: doc.runs ?? [] })
    }
  }
  return [...latest.values()]
}

function summarize(arm) {
  const scored = arm.runs.filter((run) => run.usage && run.acceptance?.pass)
  const passes = arm.runs.filter((run) => run.acceptance?.pass).length
  return {
    ...arm,
    passes,
    total: arm.runs.length,
    eligible: passes >= Math.ceil(arm.runs.length * 0.8) && scored.length >= 3,
    medianTotal: median(scored.map((run) => run.usage.totalTokens)),
    medianInput: median(scored.map((run) => run.usage.inputTokens)),
    medianOutput: median(scored.map((run) => run.usage.outputTokens)),
    medianMs: median(scored.map((run) => run.durationMs).filter(Number.isFinite)),
  }
}

function decide(rest, graftcode) {
  if (!rest?.eligible || !graftcode?.eligible) {
    return { verdict: 'Not enough passing runs for both technologies yet.' }
  }
  const reduction = Math.round((1 - graftcode.medianTotal / rest.medianTotal) * 1000) / 10
  const outputReduction = Math.round((1 - graftcode.medianOutput / rest.medianOutput) * 1000) / 10
  return {
    reduction,
    outputReduction,
    verdict:
      reduction > 0
        ? `Graftcode used ${reduction}% fewer total tokens than REST (medians ${graftcode.medianTotal} vs ${rest.medianTotal}).`
        : `Graftcode used ${-reduction}% more total tokens than REST (medians ${graftcode.medianTotal} vs ${rest.medianTotal}).`,
  }
}

export function groups(dir) {
  const rows = load(dir).map(summarize)
  const keys = [...new Set(rows.map((row) => `${row.model}::${row.template}`))]
  return keys.map((key) => {
    const members = rows.filter((row) => `${row.model}::${row.template}` === key)
    const rest = members.find((row) => row.tech === 'REST')
    const graftcode = members.find((row) => row.tech === 'Graftcode')
    return { model: members[0].model, template: members[0].template, rest, graftcode, rows: members, ...decide(rest, graftcode) }
  })
}
