/**
 * Replace results/ with your own runs, without machine-specific paths.
 *
 *   node publish.mjs --from .scratch/2026-11-05-composer-2.5
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { root, TECHS } from './workspace.mjs'

const index = process.argv.indexOf('--from')
if (index === -1 || !process.argv[index + 1]) {
  console.error('--from is required')
  process.exit(1)
}
const from = join(root, process.argv[index + 1])

function find(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) find(path, found)
    else if (name === 'runs.json') found.push(path)
  }
  return found
}

const chosen = new Map()
for (const file of find(from)) {
  const doc = JSON.parse(readFileSync(file, 'utf8'))
  if (!TECHS[doc.arm]) continue
  const started = doc.runs.map((run) => run.startedAt ?? '').sort().at(-1) ?? ''
  const current = chosen.get(doc.arm)
  if (!current || started > current.started) chosen.set(doc.arm, { doc, started })
}

for (const [arm, { doc }] of chosen) {
  doc.runs = doc.runs.map(({ work, snapshot, cleanup, ...run }) => run)
  const target = join(root, 'results', arm, 'runs.json')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify(doc, null, 2) + '\n')
  console.log('Wrote', relative(root, target))
}
