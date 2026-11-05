/**
 * Measure one technology with the Cursor SDK.
 *
 *   npm ci
 *   node run.mjs rest --runs 3
 *   node run.mjs graftcode --runs 3
 *   node compare.mjs --from .scratch
 *
 * Sign in once with the Cursor SDK, or set CURSOR_API_KEY.
 * Each run uses a fresh folder made by prepare(), outside this repo. Only that folder's
 * project rules are loaded; personal Cursor rules are not.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { getEncoding } from 'js-tiktoken'
import { assess } from './accept.mjs'
import { assertNeutralStarter, methods, prepare, prompt, root, ruleFiles, techFor } from './workspace.mjs'

const TURN_CAP = 30

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1 || !process.argv[index + 1]) return fallback
  return process.argv[index + 1]
}

function modelIds(listed) {
  const items = Array.isArray(listed) ? listed : listed?.models ?? []
  return items.map((item) => (typeof item === 'string' ? item : item.id)).filter(Boolean)
}

function countTokens(files) {
  const encoding = getEncoding('cl100k_base')
  return files.reduce((total, file) => total + encoding.encode(readFileSync(file, 'utf8')).length, 0)
}

function stopProcessesIn(dir) {
  const name = basename(dir)
  const command =
    process.platform === 'win32'
      ? ['powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${name}*' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`]]
      : ['pkill', ['-f', name]]
  spawnSync(command[0], command[1], { stdio: 'ignore' })
}

const name = process.argv[2]
const runs = Number(arg('runs', '3'))
let tech
try {
  tech = techFor(name)
  assertNeutralStarter()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
if (!Number.isInteger(runs) || runs < 1) {
  console.error('--runs must be a positive integer')
  process.exit(1)
}

const sdk = await import('@cursor/sdk')
const apiKey = process.env.CURSOR_API_KEY || undefined
if (!apiKey && (await sdk.Cursor.auth.status()).status !== 'logged-in') {
  console.error('Sign in with the Cursor SDK or set CURSOR_API_KEY.')
  process.exit(1)
}
const model = arg('model', 'composer-2.5')
try {
  const ids = modelIds(await sdk.Cursor.models.list(apiKey ? { apiKey } : {}))
  if (ids.length && !ids.includes(model)) {
    console.error(`Model "${model}" is not in Cursor.models.list() for this account.`)
    console.error(ids.join('\n'))
    process.exit(1)
  }
} catch (error) {
  console.error('Could not list models. Continuing with', model, '-', error.message)
}

const text = prompt(tech)
const stamp = new Date().toISOString().slice(0, 10)
const outDir = join(root, '.scratch', `${stamp}-${model}`, name)
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'runs.json')
const record = {
  arm: name,
  tech: tech.label,
  model,
  turnCap: TURN_CAP,
  guidanceTokens: countTokens(ruleFiles(tech)),
  prompt: text,
  note: 'Cursor adds its own system prompt to every run. It raises totals and not the difference between technologies.',
  runs: [],
}

for (let index = 1; index <= runs; index += 1) {
  const work = join(tmpdir(), `graft-ai-${Date.now()}-${name}-${index}`)
  prepare(tech, work)

  const entry = { index, work, startedAt: new Date().toISOString() }
  let agent
  try {
    agent = await sdk.Agent.create({
      ...(apiKey ? { apiKey } : {}),
      model: { id: model },
      local: { cwd: work, settingSources: ['project'] },
    })
    const run = await agent.send(text)
    entry.requestId = run.requestId
    const turns = []
    for await (const event of run.stream()) {
      if (event.type === 'usage') {
        turns.push(event.usage)
        if (turns.length >= TURN_CAP) {
          entry.turnCapHit = true
          if (run.supports?.('cancel')) await run.cancel()
          break
        }
      }
    }
    const result = await run.wait()
    entry.status = result.status
    entry.durationMs = result.durationMs ?? null
    entry.usage = result.usage ?? null
    entry.turns = turns
    entry.result = result.result ?? null
    entry.error = result.error ?? null
    entry.acceptance = assess(work, tech.label, methods(), { seedDir: join(root, 'starter') })
  } catch (error) {
    const startup = error instanceof sdk.CursorAgentError
    entry.status = startup ? 'startup-error' : 'error'
    entry.usage = null
    entry.acceptance = { pass: false, reason: error.message }
    entry.environment = startup
  } finally {
    await agent?.[Symbol.asyncDispose]?.()
  }

  const snapshot = join(outDir, `run-${index}`)
  rmSync(snapshot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  cpSync(work, snapshot, {
    recursive: true,
    filter: (source) => !source.split(/[\\/]/).some((part) => ['node_modules', 'bin', 'obj', 'dist'].includes(part)),
  })
  stopProcessesIn(work)
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
  } catch (error) {
    entry.cleanup = `left ${work}: ${error.code ?? error.message}`
  }
  entry.snapshot = snapshot
  record.runs.push(entry)
  writeFileSync(outFile, JSON.stringify(record, null, 2) + '\n')
  const usage = entry.usage ? `${entry.usage.totalTokens} tokens` : 'no usage'
  console.log(`run ${index}: ${entry.status} ${usage} acceptance=${entry.acceptance?.pass} ${entry.acceptance?.reason ?? ''}`)
}

console.log('Wrote', outFile)
console.log('Compare with: node compare.mjs --from .scratch')
