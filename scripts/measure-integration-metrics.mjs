/**
 * One-shot SLOC + tiktoken (cl100k_base) measurement for Graftcode vs REST vs gRPC.
 * Headline = EnergyPrice slice (getPrice / getPriceHistory). BusinessLogic is appendix only.
 *
 * Usage (from this folder): npm install && npm run measure
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEncoding } from 'js-tiktoken'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const outDir = join(repoRoot, 'official', 'perf-lab', 'src', 'metrics')
const enc = getEncoding('cl100k_base')

const now = new Date().toISOString()
let gitSha = 'unknown'
try {
  gitSha = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim()
} catch {
  /* not a git checkout */
}

function read(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8')
}

function extractLines(rel, ranges) {
  const lines = read(rel).split(/\r?\n/)
  const chunks = []
  for (const [from, to] of ranges) {
    chunks.push(lines.slice(from - 1, to).join('\n'))
  }
  return chunks.join('\n\n')
}

/** cloc-style: code vs comment vs blank; strings keep their content. */
function classifySource(text) {
  let i = 0
  let state = 'code' // code | lineComment | blockComment | squote | dquote | backtick
  let lineKind = 'blank' // blank | comment | code
  let code = 0
  let comment = 0
  let blank = 0

  const flushLine = () => {
    if (lineKind === 'code') code++
    else if (lineKind === 'comment') comment++
    else blank++
    lineKind = 'blank'
  }

  const mark = (kind) => {
    if (kind === 'code') lineKind = 'code'
    else if (kind === 'comment' && lineKind === 'blank') lineKind = 'comment'
  }

  while (i < text.length) {
    const c = text[i]
    const n = text[i + 1]

    if (state === 'lineComment') {
      mark('comment')
      if (c === '\n') {
        flushLine()
        state = 'code'
      }
      i++
      continue
    }
    if (state === 'blockComment') {
      mark('comment')
      if (c === '\n') flushLine()
      if (c === '*' && n === '/') {
        i += 2
        state = 'code'
        continue
      }
      i++
      continue
    }
    if (state === 'squote' || state === 'dquote' || state === 'backtick') {
      mark('code')
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '\n') flushLine()
      const end = state === 'squote' ? "'" : state === 'dquote' ? '"' : '`'
      if (c === end) state = 'code'
      i++
      continue
    }

    if (c === '\n') {
      flushLine()
      i++
      continue
    }
    if (c === '/' && n === '/') {
      mark('comment')
      state = 'lineComment'
      i += 2
      continue
    }
    if (c === '/' && n === '*') {
      mark('comment')
      state = 'blockComment'
      i += 2
      continue
    }
    if (c === "'") {
      mark('code')
      state = 'squote'
      i++
      continue
    }
    if (c === '"') {
      mark('code')
      state = 'dquote'
      i++
      continue
    }
    if (c === '`') {
      mark('code')
      state = 'backtick'
      i++
      continue
    }
    if (!/\s/.test(c)) mark('code')
    i++
  }
  if (text.length && !text.endsWith('\n')) flushLine()

  return { code, comment, blank, total: code + comment + blank }
}

function tokensOf(text) {
  return enc.encode(text).length
}

function countPublicMembers(text, kind) {
  if (kind === 'proto') {
    const rpcs = [...text.matchAll(/^\s*rpc\s+(\w+)/gm)].map((m) => m[1])
    return { kind: 'rpc', names: rpcs, count: rpcs.length }
  }
  if (kind === 'csharp') {
    const names = [...text.matchAll(/public\s+(?:static\s+)?(?:async\s+)?[\w.<>,\[\]?]+\s+(\w+)\s*\(/g)]
      .map((m) => m[1])
      .filter((n) => n !== 'Main')
    return { kind: 'method', names, count: names.length }
  }
  if (kind === 'js-client-grpc') {
    const names = [...text.matchAll(/export async function\s+(\w+)/g)].map((m) => m[1])
    return { kind: 'function', names, count: names.length }
  }
  return { kind: 'n/a', names: [], count: 0 }
}

function fileEntry(rel, bucket, extras = {}) {
  const source = extras.source ?? read(rel)
  const sloc = classifySource(source)
  return {
    path: rel.replaceAll('\\', '/'),
    bucket,
    sloc,
    tokens_cl100k: tokensOf(source),
    bytes: Buffer.byteLength(source, 'utf8'),
    ...extras.meta,
  }
}

function sumSloc(files) {
  return files.reduce(
    (acc, f) => ({
      code: acc.code + f.sloc.code,
      comment: acc.comment + f.sloc.comment,
      blank: acc.blank + f.sloc.blank,
    }),
    { code: 0, comment: 0, blank: 0 },
  )
}

function sumTokens(files) {
  return files.reduce((n, f) => n + f.tokens_cl100k, 0)
}

function byBucket(files) {
  const buckets = {}
  for (const f of files) {
    if (!buckets[f.bucket]) buckets[f.bucket] = []
    buckets[f.bucket].push(f)
  }
  const out = {}
  for (const [name, list] of Object.entries(buckets)) {
    out[name] = { sloc: sumSloc(list), tokens_cl100k: sumTokens(list), files: list.map((f) => f.path) }
  }
  return out
}

function reductionPct(from, to) {
  if (!from) return null
  return Math.round(((from - to) / from) * 1000) / 10
}

function stackSummary(name, files, publicSurface) {
  const sloc = sumSloc(files)
  const buckets = byBucket(files)
  const integrationClient = files.filter((f) => f.bucket === 'integration' || f.bucket === 'client')
  const integrationClientSloc = sumSloc(integrationClient).code
  return {
    name,
    publicSurface,
    files,
    sloc,
    tokens_cl100k: sumTokens(files),
    tokens_integration_plus_client_cl100k: sumTokens(integrationClient),
    sloc_integration_plus_client: integrationClientSloc,
    buckets,
  }
}

function pairReductions(stacks) {
  const keys = Object.keys(stacks)
  const out = {}
  for (const from of keys) {
    for (const to of keys) {
      if (from === to) continue
      const a = stacks[from]
      const b = stacks[to]
      out[`${from}_to_${to}`] = {
        sloc_total: reductionPct(a.sloc.code, b.sloc.code),
        sloc_integration_plus_client: reductionPct(a.sloc_integration_plus_client, b.sloc_integration_plus_client),
        tokens_total_cl100k: reductionPct(a.tokens_cl100k, b.tokens_cl100k),
        tokens_integration_plus_client_cl100k: reductionPct(
          a.tokens_integration_plus_client_cl100k,
          b.tokens_integration_plus_client_cl100k,
        ),
      }
    }
  }
  return out
}

// --- EnergyPrice slice (headline) ---

const restSliceFiles = [
  fileEntry('official/electric-company-ws/EnergyPriceService.cs', 'domain', {
    meta: { publicMembers: countPublicMembers(read('official/electric-company-ws/EnergyPriceService.cs'), 'csharp') },
  }),
  fileEntry('official/electric-company-ws/Controllers/EnergyPriceController.cs', 'integration', {
    meta: { publicMembers: countPublicMembers(read('official/electric-company-ws/Controllers/EnergyPriceController.cs'), 'csharp') },
  }),
  fileEntry('official/electric-company-ws/Program.cs', 'integration', {
    meta: { note: 'Entire Kestrel/TLS/CORS/Swagger host counted as handwritten integration.' },
  }),
  fileEntry('official/perf-lab/src/App.jsx', 'client', {
    source: extractLines('official/perf-lab/src/App.jsx', [
      [158, 166],
    ]),
    meta: {
      excerpt: 'App.jsx lines 158–166 (REST fetch + JSON.parse). Lab harness (performance.now, setState) left in because it wraps the fetch.',
    },
  }),
]

const grpcSliceFiles = [
  fileEntry('official/grpc-energy-price-dotnet/Services/PriceServiceImpl.cs', 'domain', {
    meta: {
      publicMembers: countPublicMembers(read('official/grpc-energy-price-dotnet/Services/PriceServiceImpl.cs'), 'csharp'),
      note: 'Includes StreamPrices (gRPC-only extra). Logic is inline; no BusinessLogic.cs.',
    },
  }),
  fileEntry('official/grpc-energy-price-dotnet/Protos/price.proto', 'integration', {
    meta: { publicMembers: countPublicMembers(read('official/grpc-energy-price-dotnet/Protos/price.proto'), 'proto') },
  }),
  fileEntry('official/grpc-energy-price-dotnet/Program.cs', 'integration'),
  fileEntry('official/perf-lab/src/priceProto.js', 'client'),
  fileEntry('official/perf-lab/src/grpcClient.js', 'client', {
    meta: { publicMembers: countPublicMembers(read('official/perf-lab/src/grpcClient.js'), 'js-client-grpc') },
  }),
]

const graftSliceFiles = [
  fileEntry('official/electric-company-be/EnergyPriceService.cs', 'domain', {
    meta: { publicMembers: countPublicMembers(read('official/electric-company-be/EnergyPriceService.cs'), 'csharp') },
  }),
  fileEntry('official/perf-lab/src/App.jsx', 'client', {
    source: extractLines('official/perf-lab/src/App.jsx', [
      [3, 3],
      [87, 104],
      [106, 113],
      [180, 184],
    ]),
    meta: {
      excerpt: 'App.jsx lines 3 (import), 87–104 (GraftConfig), 106–113 (getPrice), 180–184 (getPriceHistory). No handwritten integration server — gg hosts the DLL.',
    },
  }),
]

const sliceStacks = {
  rest: stackSummary('REST', restSliceFiles, {
    endpoints_or_methods: ['GetPrice', 'GetHistory'],
    count: 2,
  }),
  grpc: stackSummary('gRPC', grpcSliceFiles, {
    endpoints_or_methods: ['GetPrice', 'GetPriceHistory', 'StreamPrices'],
    count: 3,
    extra: 'StreamPrices has no REST/Graftcode counterpart',
  }),
  graftcode: stackSummary('Graftcode', graftSliceFiles, {
    endpoints_or_methods: ['GetPrice', 'GetPriceHistory'],
    count: 2,
  }),
}

// --- Full surface appendix (not the lab call path) ---

const restFullExtra = [
  'official/electric-company-ws/BusinessLogic.cs',
  'official/electric-company-ws/Controllers/BillingController.cs',
  'official/electric-company-ws/Controllers/MeterController.cs',
  'official/electric-company-ws/Controllers/TariffController.cs',
  'official/electric-company-ws/Controllers/OutageController.cs',
  'official/electric-company-ws/Controllers/LoyaltyController.cs',
  'official/electric-company-ws/Dtos/BillingDtos.cs',
  'official/electric-company-ws/Dtos/MeterDtos.cs',
  'official/electric-company-ws/Dtos/TariffDtos.cs',
  'official/electric-company-ws/Dtos/OutageDtos.cs',
  'official/electric-company-ws/Dtos/LoyaltyDtos.cs',
].map((p) => fileEntry(p, p.includes('BusinessLogic') ? 'domain' : 'integration'))

const restFullFiles = [...restSliceFiles.filter((f) => f.path !== 'official/perf-lab/src/App.jsx'), ...restFullExtra]
const graftFullFiles = [
  fileEntry('official/electric-company-be/EnergyPriceService.cs', 'domain'),
  fileEntry('official/electric-company-be/BusinessLogic.cs', 'domain', {
    meta: {
      disclaimer:
        'Compiled into EnergyPriceService.dll and may be exported by gg; not called by EnergyPriceService or perf-lab.',
    },
  }),
]

const fullStacks = {
  rest: stackSummary('REST', restFullFiles, { note: 'All controllers + DTOs + BusinessLogic + EnergyPrice slice server files. Client omitted.' }),
  graftcode: stackSummary('Graftcode', graftFullFiles, { note: 'EnergyPriceService + unused BusinessLogic in the hosted DLL.' }),
  grpc: { name: 'gRPC', n_a: true, reason: 'Demo implements only PriceService RPCs; no billing/meter/tariff/outage/loyalty.' },
}

const locComparison = {
  measuredAt: now,
  gitSha,
  tool: {
    sloc: 'custom cloc-style scanner in scripts/measure-integration-metrics.mjs (code vs // and /* */ comments vs blank; strings preserved)',
    tokens: 'js-tiktoken cl100k_base (OpenAI-compatible). Proxy on committed source — not a live agent session.',
  },
  headline: 'energyPriceSlice',
  tables: {
    energyPriceSlice: {
      description:
        'Code on the perf-lab getPrice / getPriceHistory path. BusinessLogic.cs is excluded. StreamPrices counted only under gRPC.',
      stacks: sliceStacks,
      reductions: pairReductions(sliceStacks),
      notes: [
        'GetPriceHistory returns the same double[] payload through Graftcode, REST, and gRPC.',
        'gg / Kestrel binaries are not counted. Generated protoc C# under obj/ is not counted.',
        'Graftcode integration (server) SLOC is 0 because the gateway hosts the class library; only the facade is handwritten.',
      ],
    },
    fullSurface: {
      description:
        'APPENDIX. REST HTTP surface for billing/* vs Graftcode BusinessLogic in the DLL. Not the lab invocation path. Do not use as the page headline without the disclaimer.',
      disclaimer: 'perf-lab does not call BillingLogic / MeterLogic / TariffLogic / OutageLogic / LoyaltyLogic.',
      stacks: fullStacks,
      reductions: {
        rest_to_graftcode: {
          sloc_total: reductionPct(fullStacks.rest.sloc.code, fullStacks.graftcode.sloc.code),
          tokens_total_cl100k: reductionPct(fullStacks.rest.tokens_cl100k, fullStacks.graftcode.tokens_cl100k),
        },
      },
    },
  },
}

const tokenComparison = {
  measuredAt: now,
  gitSha,
  method: 'tiktoken-proxy',
  disclaimer:
    'estimated tokens of handwritten integration code (cl100k_base on committed files from the EnergyPrice slice). This is NOT "tokens to generate the system" from an identical prompt experiment.',
  encoding: 'cl100k_base',
  energyPriceSlice: {
    rest: {
      tokens_total: sliceStacks.rest.tokens_cl100k,
      tokens_integration_plus_client: sliceStacks.rest.tokens_integration_plus_client_cl100k,
    },
    grpc: {
      tokens_total: sliceStacks.grpc.tokens_cl100k,
      tokens_integration_plus_client: sliceStacks.grpc.tokens_integration_plus_client_cl100k,
    },
    graftcode: {
      tokens_total: sliceStacks.graftcode.tokens_cl100k,
      tokens_integration_plus_client: sliceStacks.graftcode.tokens_integration_plus_client_cl100k,
      note: 'T_rules (Graftcode AI rules in context) is not included; this proxy only tokenizes committed application source.',
    },
  },
  reductions: pairReductions(sliceStacks),
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'loc-comparison.json'), JSON.stringify(locComparison, null, 2) + '\n')
writeFileSync(join(outDir, 'token-comparison.json'), JSON.stringify(tokenComparison, null, 2) + '\n')

const s = locComparison.tables.energyPriceSlice.stacks
const r = locComparison.tables.energyPriceSlice.reductions
const f = locComparison.tables.fullSurface

const md = `# Integration metrics (Graftcode vs REST vs gRPC)

Static, one-shot measurement. The perf-lab UI does **not** recompute these. Numbers live in
\`loc-comparison.json\` and \`token-comparison.json\`. Re-run from \`scripts/\`:

\`\`\`bash
cd scripts && npm install && npm run measure
\`\`\`

- Measured at: \`${now}\`
- Git SHA: \`${gitSha}\`
- SLOC tool: custom cloc-style scanner (code lines; \`//\` and \`/* */\` comments and blank lines excluded)
- Tokens: \`js-tiktoken\` **cl100k_base** on committed source (proxy, not a live prompt session)

## What is counted (EnergyPrice slice — headline)

Perf-lab only calls \`getPrice\` / \`getPriceHistory\`.

| Bucket | REST | gRPC | Graftcode |
| --- | --- | --- | --- |
| Domain + facade | \`electric-company-ws/EnergyPriceService.cs\` | \`PriceServiceImpl.cs\` (inline RNG; includes StreamPrices) | \`electric-company-be/EnergyPriceService.cs\` |
| Integration (server) | \`EnergyPriceController\`, \`Program.cs\` | \`price.proto\`, \`Program.cs\` | none (\`gg\` hosts the DLL; binary not counted) |
| Client | \`App.jsx\` REST fetch excerpt (lines 158–166) | \`priceProto.js\` + \`grpcClient.js\` | \`App.jsx\` import + GraftConfig + calls (lines 3, 87–104, 106–113, 180–184) |

**Not counted:** \`node_modules\`, \`obj/\`, \`.graftcode/\`, generated Graft client, generated \`protoc\` C#, \`gg\` / Kestrel binaries, Dockerfiles, Playwright, comments, blanks.

**Not in the headline:** [\`official/electric-company-be/BusinessLogic.cs\`](../../../electric-company-be/BusinessLogic.cs). It is compiled into the hosted DLL and *may* be exported by the gateway, but \`EnergyPriceService\` and perf-lab never call it. REST billing controllers use a copy of that logic; the lab does not hit those endpoints. gRPC has no \`BusinessLogic\` file.

**Payload shape:** \`GetPriceHistory\` returns the same \`double[]\` through Graftcode, REST, and gRPC.

**gRPC extra:** \`StreamPrices\` has no REST/Graftcode counterpart. It is included in the gRPC column and called out, not subtracted.

## EnergyPrice slice results (SLOC = code lines)

| Stack | Files | SLOC | Integration+client SLOC | Tokens (all) | Tokens (integration+client) | Public methods / RPCs |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| REST | ${s.rest.files.length} | ${s.rest.sloc.code} | ${s.rest.sloc_integration_plus_client} | ${s.rest.tokens_cl100k} | ${s.rest.tokens_integration_plus_client_cl100k} | ${s.rest.publicSurface.endpoints_or_methods.join(', ')} |
| gRPC | ${s.grpc.files.length} | ${s.grpc.sloc.code} | ${s.grpc.sloc_integration_plus_client} | ${s.grpc.tokens_cl100k} | ${s.grpc.tokens_integration_plus_client_cl100k} | ${s.grpc.publicSurface.endpoints_or_methods.join(', ')} |
| Graftcode | ${s.graftcode.files.length} | ${s.graftcode.sloc.code} | ${s.graftcode.sloc_integration_plus_client} | ${s.graftcode.tokens_cl100k} | ${s.graftcode.tokens_integration_plus_client_cl100k} | ${s.graftcode.publicSurface.endpoints_or_methods.join(', ')} |

Headline reductions (positive = destination is smaller):

| From → to | SLOC total | SLOC integration+client | Tokens total | Tokens integration+client |
| --- | ---: | ---: | ---: | ---: |
| REST → Graftcode | ${r.rest_to_graftcode.sloc_total}% | ${r.rest_to_graftcode.sloc_integration_plus_client}% | ${r.rest_to_graftcode.tokens_total_cl100k}% | ${r.rest_to_graftcode.tokens_integration_plus_client_cl100k}% |
| gRPC → Graftcode | ${r.grpc_to_graftcode.sloc_total}% | ${r.grpc_to_graftcode.sloc_integration_plus_client}% | ${r.grpc_to_graftcode.tokens_total_cl100k}% | ${r.grpc_to_graftcode.tokens_integration_plus_client_cl100k}% |
| REST → gRPC | ${r.rest_to_grpc.sloc_total}% | ${r.rest_to_grpc.sloc_integration_plus_client}% | ${r.rest_to_grpc.tokens_total_cl100k}% | ${r.rest_to_grpc.tokens_integration_plus_client_cl100k}% |

Suggested later UI copy (do not paste into \`App.jsx\` in this step): Graftcode uses **${r.rest_to_graftcode.sloc_integration_plus_client}%** less handwritten integration+client code than REST and **${r.grpc_to_graftcode.sloc_integration_plus_client}%** less than gRPC for GetPrice/GetPriceHistory.

## Token proxy disclaimer

\`token-comparison.json\` tokenizes the **same committed files** as the SLOC table. It is *estimated tokens of handwritten integration code*, not tokens consumed by an agent that built REST vs gRPC vs Graftcode from one prompt. Graftcode AI rules (\`rules/\`) are **not** added to T_rules here.

A same-prompt experiment (see \`community/dotnet-react-frontend/seed/README.md\`) was not run.

## Appendix: full surface (not the lab path)

REST SLOC ${f.stacks.rest.sloc.code} vs Graftcode SLOC ${f.stacks.graftcode.sloc.code} (${f.reductions.rest_to_graftcode.sloc_total}% reduction). gRPC: ${f.stacks.grpc.reason}

Do not quote this as “the same business logic the lab runs.”
`

writeFileSync(join(outDir, 'METRICS.md'), md)

const rel = (p) => relative(repoRoot, p).replaceAll('\\', '/')
console.log('Wrote', rel(join(outDir, 'loc-comparison.json')))
console.log('Wrote', rel(join(outDir, 'token-comparison.json')))
console.log('Wrote', rel(join(outDir, 'METRICS.md')))
console.log('\nSlice SLOC code:', {
  rest: s.rest.sloc.code,
  grpc: s.grpc.sloc.code,
  graftcode: s.graftcode.sloc.code,
})
console.log('Slice integration+client SLOC:', {
  rest: s.rest.sloc_integration_plus_client,
  grpc: s.grpc.sloc_integration_plus_client,
  graftcode: s.graftcode.sloc_integration_plus_client,
})
console.log('Reductions REST→Graftcode / gRPC→Graftcode (int+client SLOC %):', {
  rest_to_graftcode: r.rest_to_graftcode.sloc_integration_plus_client,
  grpc_to_graftcode: r.grpc_to_graftcode.sloc_integration_plus_client,
})
