/**
 * Write the numbers and snippets the perf-lab page shows.
 *
 *   node export-page.mjs           update official/perf-lab/src/metrics/ai-token-cost.json
 *   node export-page.mjs --check   fail if that file is out of date
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { getEncoding } from 'js-tiktoken'
import { project, read, starterProject } from './examples.mjs'
import { groups } from './results.mjs'
import { root, ruleFiles, TECHS } from './workspace.mjs'

const target = join(root, '..', '..', 'official', 'perf-lab', 'src', 'metrics', 'ai-token-cost.json')
const encoding = getEncoding('cl100k_base')

function graftCall(source) {
  const line = source.match(/appendResult\([^\n]*['"]calculateTax['"][^\n]*\)/)
  if (line) return line[0].trim()
  const block = source.match(/appendResult\(\s*['"]calculateTax['"],[\s\S]*?\n\s*\)/)
  if (block) return block[0].replace(/^ {6}/gm, '').trimEnd()
  const direct = source.match(/[^\n]*BillingLogic\.calculateTax\([^)\n]*\)[^\n]*/)
  if (direct) return direct[0].trim()
  throw new Error('Graftcode calculateTax call not found in src/App.jsx')
}

function between(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (from === -1 || to === -1) throw new Error(`Snippet marker not found: ${start}`)
  return source.slice(from, to).trimEnd()
}

function filesUnder(name) {
  const dir = join(root, '..', '..', 'official', 'perf-lab', 'results', name)
  const found = []
  const visit = (current) => {
    for (const entry of readdirSync(current)) {
      if (['node_modules', 'bin', 'obj', 'dist', '.cursor'].includes(entry)) continue
      const path = join(current, entry)
      if (statSync(path).isDirectory()) visit(path)
      else found.push(relative(dir, path).replaceAll('\\', '/'))
    }
  }
  visit(dir)
  return found
}

function fileNamed(name, fileName) {
  const matches = filesUnder(name).filter((path) => path.endsWith(`/${fileName}`) || path === fileName)
  if (matches.length !== 1) throw new Error(`${fileName}: found ${matches.length} in results/${name}`)
  return matches[0]
}

function restEndpoint() {
  const hits = []
  for (const path of filesUnder('rest')) {
    const source = read('rest', path)
    const match = source.match(/[^\n]*\/api\/(?:billing\/)?calculate-tax[\s\S]*?\n\s*\}\);?/)
    if (match) hits.push({ path, source: match[0].trim().replace(/^ {8}/gm, '') })
  }
  const chosen = hits.find((hit) => hit.source.includes('CalculateTaxResponse')) ?? hits[0]
  if (!chosen) throw new Error('calculate-tax endpoint not found in the REST example')
  return chosen
}

function snippet(title, path, source) {
  return { title, path, source, tokens: encoding.encode(source).length }
}

function rules(tech) {
  return ruleFiles(tech).map((file) => {
    const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trimEnd()
    return {
      path: file.slice(root.length + 1).replaceAll('\\', '/'),
      tokens: encoding.encode(source).length,
      source,
    }
  })
}

const starter = starterProject()
const [group] = groups(join(root, 'results'))
if (!group?.reduction) throw new Error('results/ does not contain a passing REST and Graftcode pair')

const restApi = read('rest', 'src/api.js')
const graftApp = read('graftcode', 'src/App.jsx')

const data = {
  model: group.model,
  prompt: group.template,
  reduction: group.reduction,
  outputReduction: group.outputReduction,
  starterFiles: starter.files.length,
  starterLines: starter.lines,
  repoPath: 'experiments/ai-integration',
  stacks: Object.fromEntries(
    [
      ['rest', group.rest],
      ['graftcode', group.graftcode],
    ].map(([name, row]) => {
      const code = project(name)
      return [
        name,
        {
          name: TECHS[name].label,
          totalTokens: row.medianTotal,
          inputTokens: row.medianInput,
          outputTokens: row.medianOutput,
          files: code.files.length,
          lines: code.lines,
          paths: code.files.map((file) => file.path),
          rules: rules(TECHS[name]),
        },
      ]
    }),
  ),
  snippets: {
    rest: [
      snippet('Request type', fileNamed('rest', 'CalculateTaxRequest.cs'), read('rest', fileNamed('rest', 'CalculateTaxRequest.cs'))),
      snippet('Response type', fileNamed('rest', 'CalculateTaxResponse.cs'), read('rest', fileNamed('rest', 'CalculateTaxResponse.cs'))),
      snippet('Endpoint', restEndpoint().path, restEndpoint().source),
      snippet('Client function', 'src/api.js', between(restApi, 'export async function calculateTax', 'export async function isBudgetBillingEligible')),
    ],
    graftcode: [
      snippet('Direct call', 'src/App.jsx', graftCall(graftApp)),
    ],
  },
}

const json = JSON.stringify(data, null, 2) + '\n'
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8')
  if (current !== json) {
    console.error(`${target} is out of date. Run: node export-page.mjs`)
    process.exit(1)
  }
  console.log('Page data matches the recorded runs and the finished projects.')
} else {
  writeFileSync(target, json)
  console.log('Wrote', target)
}
console.log(group.verdict)
console.log(`REST project: ${data.stacks.rest.files} files, ${data.stacks.rest.lines} lines. Graftcode project: ${data.stacks.graftcode.files} files, ${data.stacks.graftcode.lines} lines. Starter: ${data.starterFiles} files.`)
