/**
 * Print REST against Graftcode.
 *
 *   node compare.mjs                 committed runs in results/
 *   node compare.mjs --from .scratch your own runs
 */
import { join } from 'node:path'
import { groups } from './results.mjs'
import { root } from './workspace.mjs'

const fromIndex = process.argv.indexOf('--from')
const source = join(root, fromIndex === -1 ? 'results' : process.argv[fromIndex + 1])

const found = groups(source)
if (!found.length) {
  console.log(`No runs in ${source} yet.`)
  process.exit(0)
}

for (const group of found) {
  console.log(`\n${group.model}`)
  console.log('technology'.padEnd(12), 'pass'.padEnd(8), 'median total'.padEnd(16), 'median output')
  for (const row of [group.rest, group.graftcode].filter(Boolean)) {
    console.log(
      row.tech.padEnd(12),
      `${row.passes}/${row.total}`.padEnd(8),
      String(row.medianTotal ?? '—').padEnd(16),
      String(row.medianOutput ?? '—'),
    )
  }
  console.log(group.verdict)
}
