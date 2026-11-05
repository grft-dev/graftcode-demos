/**
 * Structural acceptance for an experiment run.
 * A pass means the assistant produced the integration the prompt asked for and the backend builds.
 * REST: new server code calls every method in methods.json, with a route per method and a fetch client.
 * Graftcode: the client calls every method directly, sets GraftConfig.host, and a Dockerfile runs gg.
 * It does not start Docker. Network or image failures are not counted against an arm.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const SKIP = new Set(['node_modules', 'bin', 'obj', '.git', '.cursor', 'graft', 'dist'])

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, found)
    else found.push(path)
  }
  return found
}

function read(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function buildAll(projects) {
  const failures = []
  for (const project of projects) {
    const out = mkdtempSync(join(tmpdir(), 'accept-build-'))
    const result = spawnSync('dotnet', ['build', project, '-o', out, '-nologo', '-v', 'q'], { encoding: 'utf8' })
    rmSync(out, { recursive: true, force: true })
    if (result.status !== 0) failures.push(project)
  }
  return failures
}

export function assess(dir, tech, methods, { seedDir, build = true } = {}) {
  const files = walk(dir)
  const seedFiles = new Set(seedDir ? walk(seedDir).map((file) => relative(seedDir, file)) : [])
  const csharp = files.filter((file) => file.endsWith('.cs')).map(read).join('\n')
  const addedCsharp = files
    .filter((file) => file.endsWith('.cs') && !seedFiles.has(relative(dir, file)))
    .map(read)
    .join('\n')
  const client = files
    .filter((file) => /\.(js|jsx|tsx|ts)$/.test(file) && !/vite\.config/.test(file))
    .filter((file) => !relative(dir, file).startsWith('backend'))
    .map(read)
    .join('\n')
  const docker = files.filter((file) => /dockerfile$/i.test(file)).map(read).join('\n')
  const projects = files.filter((file) => file.endsWith('.csproj'))

  const names = Object.values(methods).flat()
  const missingMethods =
    tech === 'REST'
      ? names.filter((name) => !new RegExp(`\\b${name}\\b`).test(addedCsharp))
      : names.filter((name) => !new RegExp(`\\b${name}\\b`, 'i').test(client))
  const hasController = /class\s+\w*Controller\b/.test(csharp)
  const routes = (csharp.match(/\[Http(Get|Post|Put)\b|\bMap(Get|Post|Put)\s*\(/g) ?? []).length
  const buildFailures = build ? buildAll(projects) : []

  const problems = []
  if (missingMethods.length) {
    const where = tech === 'REST' ? 'no endpoint calls' : 'client does not call'
    problems.push(`${where} ${missingMethods.length} of ${names.length} methods`)
  }
  if (!projects.length) problems.push('no .csproj')
  if (buildFailures.length) problems.push(`build failed: ${buildFailures.map((p) => relative(dir, p)).join(', ')}`)

  if (tech === 'REST') {
    if (routes < names.length) problems.push(`${routes} routes for ${names.length} methods`)
    if (!/fetch\s*\(/.test(client)) problems.push('no fetch client')
  } else {
    if (!/GraftConfig\.host\s*=/.test(client)) problems.push('client does not set GraftConfig.host')
    if (!/\bgg\b/.test(docker)) problems.push('Dockerfile does not run gg')
    if (hasController || routes) problems.push('a controller or route was added')
  }

  const pass = problems.length === 0
  return {
    pass,
    reason: pass ? `all ${names.length} methods wired, backend builds` : problems.join('; '),
    missingMethods,
    routes,
    buildFailures: buildFailures.map((p) => relative(dir, p)),
  }
}
