/**
 * Count handwritten integration code for REST, gRPC, and Graftcode.
 *
 *   npm run metrics:update   rewrite the JSON and METRICS.md
 *   npm run metrics:check    exit 1 if the committed files differ
 *
 * Regions come from metrics:begin / metrics:end markers. See metrics.manifest.json.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEncoding } from 'js-tiktoken'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const metricsDir = join(repoRoot, 'official', 'perf-lab', 'src', 'metrics')
const jsonPath = join(metricsDir, 'integration-metrics.json')
const mdPath = join(metricsDir, 'METRICS.md')
const legacy = ['loc-comparison.json', 'token-comparison.json'].map((name) => join(metricsDir, name))

const cl100k = getEncoding('cl100k_base')
const o200k = getEncoding('o200k_base')

const STACKS = ['rest', 'grpc', 'graftcode']
const STACK_NAMES = { rest: 'REST', grpc: 'gRPC', graftcode: 'Graftcode' }
const SCOPES = ['getPrice', 'whole']
const BUCKETS = ['counted', 'excluded', 'extra', 'domain', 'deploy', 'dependency']

const check = process.argv.includes('--check')
const update = process.argv.includes('--update') || !check

function read(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8').replaceAll('\r\n', '\n')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function markerPattern(comment) {
  const prefix = comment === '#' ? '#' : '//'
  return {
    begin: new RegExp(`^\\s*${prefix}\\s*metrics:begin\\s+(\\S+)\\s*$`),
    end: new RegExp(`^\\s*${prefix}\\s*metrics:end\\s+(\\S+)\\s*$`),
  }
}

function extractRegions(text, comment, file) {
  const { begin, end } = markerPattern(comment)
  const found = new Map()
  let current = null
  let body = []
  for (const line of text.split('\n')) {
    const opened = line.match(begin)
    const closed = line.match(end)
    if (opened && closed) fail(`${file}: a line is both begin and end`)
    if (opened) {
      if (current) fail(`${file}: nested marker ${opened[1]} inside ${current}`)
      current = opened[1]
      body = []
      continue
    }
    if (closed) {
      if (!current) fail(`${file}: metrics:end ${closed[1]} without begin`)
      if (closed[1] !== current) fail(`${file}: metrics:end ${closed[1]} closes ${current}`)
      if (found.has(current)) fail(`${file}: duplicate region ${current}`)
      found.set(current, body.join('\n').replace(/^\n+|\n+$/g, ''))
      current = null
      body = []
      continue
    }
    if (current) body.push(line)
  }
  if (current) fail(`${file}: unclosed region ${current}`)
  return found
}

function countLines(text) {
  if (!text.trim()) return 0
  return text.split('\n').filter((line) => line.trim().length > 0).length
}

function snippetFrom(entry, source) {
  if (!source.trim()) fail(`Region ${entry.id} is empty`)
  return {
    id: entry.id,
    title: entry.title,
    path: entry.file,
    source,
    lines: countLines(source),
    tokensCl100k: cl100k.encode(source).length,
    tokensO200k: o200k.encode(source).length,
    ...(entry.reason ? { reason: entry.reason } : {}),
  }
}

function assertApp(source) {
  if (/\bfetch\s*\(/.test(source)) fail('App.jsx still contains a fetch( call. Put it in src/clients.')
  if (source.includes('createPromiseClient')) fail('App.jsx still contains createPromiseClient.')
  if (/\bGraftConfig\b/.test(source)) fail('App.jsx still contains GraftConfig. Put it in src/clients/graftClient.js.')
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

const manifest = JSON.parse(read('scripts/metrics.manifest.json'))
assertApp(read(manifest.appFile))

for (const group of manifest.identicalGroups) {
  const texts = group.map(read)
  if (new Set(texts).size !== 1) {
    fail(`Domain copies differ:\n${group.join('\n')}`)
  }
}

const byFile = new Map()
for (const region of manifest.regions) {
  if (!byFile.has(region.file)) byFile.set(region.file, { comment: region.comment, expected: new Set(), regions: [] })
  const group = byFile.get(region.file)
  if (group.comment !== region.comment) fail(`${region.file}: mixed comment prefixes`)
  group.expected.add(region.id)
  group.regions.push(region)
}

const extracted = new Map()
for (const [file, group] of byFile) {
  const found = extractRegions(read(file), group.comment, file)
  for (const id of found.keys()) {
    if (!group.expected.has(id)) fail(`${file}: unknown marker ${id}`)
  }
  for (const id of group.expected) {
    if (!found.has(id)) fail(`${file}: missing marker ${id}`)
    extracted.set(id, found.get(id))
  }
}

for (const entry of manifest.wholeFiles) {
  const text = read(entry.file)
  if (/metrics:begin|metrics:end/.test(text)) {
    fail(`${entry.file} is a whole-file count and also contains markers`)
  }
  extracted.set(entry.id, text.replace(/^\n+|\n+$/g, ''))
}

for (const entry of manifest.lineSelections) {
  const matches = read(entry.file).split('\n').filter((line) => line.includes(entry.includes))
  if (matches.length !== 1) {
    fail(`${entry.file}: expected one line containing ${JSON.stringify(entry.includes)}, found ${matches.length}`)
  }
  extracted.set(entry.id, matches[0].trim())
}

function materialize(entry) {
  return snippetFrom(entry, extracted.get(entry.id))
}

const domain = manifest.domain.map((entry) => {
  const source = read(entry.sourceFrom).replace(/^\n+|\n+$/g, '')
  return {
    id: entry.id,
    title: entry.title,
    scopes: entry.scopes,
    paths: entry.paths,
    source,
    lines: countLines(source),
    tokensCl100k: cl100k.encode(source).length,
    tokensO200k: o200k.encode(source).length,
  }
})

const catalog = [
  ...manifest.regions,
  ...manifest.wholeFiles,
  ...manifest.lineSelections,
]

function snippetsFor(scope, stack, bucket) {
  return catalog
    .filter((entry) => entry.stack === stack && entry.bucket === bucket && entry.scopes.includes(scope))
    .map(materialize)
}

function sum(snippets, key) {
  return snippets.reduce((total, snippet) => total + snippet[key], 0)
}

function reduction(from, to) {
  if (!from) return null
  return Math.round(((from - to) / from) * 1000) / 10
}

function times(from, to) {
  if (!to) return null
  return Math.round((from / to) * 10) / 10
}

const scopeNotes = {
  getPrice: 'The getPrice call the benchmark runs. History, billing, and StreamPrices are not in this total.',
  whole: 'getPrice, getPriceHistory, and the REST billing, meter, tariff, outage, and loyalty controllers. gRPC has no billing surface in this demo, so its column is the energy-price service only.',
}

const scopes = {}
for (const scope of SCOPES) {
  const stacks = {}
  for (const stack of STACKS) {
    const buckets = {}
    for (const bucket of BUCKETS) buckets[bucket] = snippetsFor(scope, stack, bucket)
    const counted = buckets.counted
    stacks[stack] = {
      name: STACK_NAMES[stack],
      lines: sum(counted, 'lines'),
      tokensCl100k: sum(counted, 'tokensCl100k'),
      tokensO200k: sum(counted, 'tokensO200k'),
      ...buckets,
    }
  }
  const graft = stacks.graftcode
  const versus = {}
  for (const stack of ['rest', 'grpc']) {
    versus[stack] = {
      linesPercentFewer: reduction(stacks[stack].lines, graft.lines),
      tokensCl100kPercentFewer: reduction(stacks[stack].tokensCl100k, graft.tokensCl100k),
      tokensO200kPercentFewer: reduction(stacks[stack].tokensO200k, graft.tokensO200k),
      linesTimes: times(stacks[stack].lines, graft.lines),
      tokensCl100kTimes: times(stacks[stack].tokensCl100k, graft.tokensCl100k),
    }
  }
  scopes[scope] = { note: scopeNotes[scope], stacks, versus }
}

const hashedFiles = [
  ...new Set([
    ...manifest.regions.map((entry) => entry.file),
    ...manifest.wholeFiles.map((entry) => entry.file),
    ...manifest.lineSelections.map((entry) => entry.file),
    ...manifest.identicalGroups.flat(),
    'scripts/metrics.manifest.json',
  ]),
].sort()

const inputsHash = sha256(hashedFiles.map((file) => `${file}\n${read(file)}`).join('\n---\n'))

const report = {
  inputsHash,
  encodings: ['cl100k_base', 'o200k_base'],
  label: 'Tokens of the handwritten integration code shown below. Not a live assistant session.',
  domain,
  scopes,
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

const jsonText = `${JSON.stringify(stable(report), null, 2)}\n`

function row(scope, stack) {
  const item = scopes[scope].stacks[stack]
  return `| ${item.name} | ${item.lines} | ${item.tokensCl100k} | ${item.tokensO200k} |`
}

function versusRow(scope, stack) {
  const item = scopes[scope].versus[stack]
  return `| ${STACK_NAMES[stack]} → Graftcode | ${item.linesPercentFewer}% | ${item.tokensCl100kPercentFewer}% | ${item.tokensO200kPercentFewer}% |`
}

const markdown = `# Integration metrics

Generated by \`scripts/measure-integration-metrics.mjs\`. Do not edit by hand.

\`\`\`powershell
cd scripts
npm ci
npm run metrics:check
\`\`\`

Inputs hash: \`${inputsHash}\`

Counted text is the source inside \`metrics:begin\` / \`metrics:end\` markers (or a whole file listed in \`scripts/metrics.manifest.json\`). Lines are non-blank lines of that text. Tokens are \`js-tiktoken\` \`cl100k_base\` and \`o200k_base\` of that same text. This is the size of handwritten integration code, not tokens spent by a live assistant.

Domain files are identical across REST and Graftcode and are not counted. Transport setup, Swagger, health checks, generated code, and the hand-written \`priceProto.js\` stand-in are shown in the JSON and not counted. Dockerfiles and dependency lines are separate rows. \`StreamPrices\` is gRPC-only and is not in the shared total.

## getPrice

| Stack | Lines | cl100k tokens | o200k tokens |
| --- | ---: | ---: | ---: |
${STACKS.map((stack) => row('getPrice', stack)).join('\n')}

| Comparison | Lines | cl100k | o200k |
| --- | ---: | ---: | ---: |
${['rest', 'grpc'].map((stack) => versusRow('getPrice', stack)).join('\n')}

Positive means Graftcode is smaller. The formula is \`(other - graftcode) / other\`.

## Whole project

${scopeNotes.whole}

| Stack | Lines | cl100k tokens | o200k tokens |
| --- | ---: | ---: | ---: |
${STACKS.map((stack) => row('whole', stack)).join('\n')}

| Comparison | Lines | cl100k | o200k |
| --- | ---: | ---: | ---: |
${['rest', 'grpc'].map((stack) => versusRow('whole', stack)).join('\n')}

Dockerfile lines (separate from the table above): REST ${scopes.getPrice.stacks.rest.deploy[0].lines}, gRPC ${scopes.getPrice.stacks.grpc.deploy[0].lines}, Graftcode ${scopes.getPrice.stacks.graftcode.deploy[0].lines}.
`

const rel = (path) => relative(repoRoot, path).replaceAll('\\', '/')

if (check) {
  const problems = []
  if (!existsSync(jsonPath) || readFileSync(jsonPath, 'utf8').replaceAll('\r\n', '\n') !== jsonText) {
    problems.push(`${rel(jsonPath)} is out of date. Run npm run metrics:update.`)
  }
  if (!existsSync(mdPath) || readFileSync(mdPath, 'utf8').replaceAll('\r\n', '\n') !== markdown) {
    problems.push(`${rel(mdPath)} is out of date. Run npm run metrics:update.`)
  }
  for (const path of legacy) {
    if (existsSync(path)) problems.push(`${rel(path)} is leftover. Delete it.`)
  }
  if (problems.length) fail(problems.join('\n'))
  console.log('metrics:check ok')
  console.log(inputsHash)
  for (const scope of SCOPES) {
    const parts = STACKS.map((stack) => `${STACK_NAMES[stack]} ${scopes[scope].stacks[stack].lines} lines / ${scopes[scope].stacks[stack].tokensCl100k} cl100k`)
    console.log(`${scope}: ${parts.join(' | ')}`)
  }
} else if (update) {
  writeFileSync(jsonPath, jsonText)
  writeFileSync(mdPath, markdown)
  for (const path of legacy) {
    if (existsSync(path)) unlinkSync(path)
  }
  console.log('Wrote', rel(jsonPath))
  console.log('Wrote', rel(mdPath))
  console.log(inputsHash)
}
