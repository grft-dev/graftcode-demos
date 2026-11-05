/**
 * Run REST and Graftcode, then write a comparison page.
 *
 *   npm install
 *   node verify.mjs
 *   node verify.mjs --runs 5 --model composer-2.5
 *
 * Writes .scratch/report.html and opens it. Sign in with the Cursor SDK, or set CURSOR_API_KEY.
 * This bills your Cursor account. A verdict needs at least 3 passing runs on each side.
 */
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { root } from './workspace.mjs'

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1 || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) return fallback
  return process.argv[index + 1]
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node verify.mjs [--runs 3] [--model composer-2.5] [--no-open]')
  console.log('Runs the agent for REST and Graftcode, then writes .scratch/report.html and opens it.')
  process.exit(0)
}

const runs = arg('runs', '3')
const model = arg('model', 'composer-2.5')
if (!/^\d+$/.test(runs) || Number(runs) < 1) {
  console.error('--runs must be a positive integer')
  process.exit(1)
}

function nodeScript(args) {
  return spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root })
}

let failed = 0
for (const name of ['rest', 'graftcode']) {
  console.log(`\n--- ${name} ---`)
  const result = nodeScript([join(root, 'run.mjs'), name, '--runs', runs, '--model', model])
  if (result.status !== 0) failed = result.status ?? 1
}

const out = join(root, '.scratch', 'report.html')
const report = nodeScript([join(root, 'report.mjs'), '--from', '.scratch', '--out', out])
if (report.status !== 0) process.exit(report.status ?? 1)
nodeScript([join(root, 'compare.mjs'), '--from', '.scratch'])
console.log(`\nComparison page: ${out}`)

if (!process.argv.includes('--no-open')) {
  const child =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', out], { stdio: 'ignore', detached: true, windowsHide: true })
      : process.platform === 'darwin'
        ? spawn('open', [out], { stdio: 'ignore', detached: true })
        : spawn('xdg-open', [out], { stdio: 'ignore', detached: true })
  child.on('error', () => {})
  child.unref()
}

process.exit(failed)
