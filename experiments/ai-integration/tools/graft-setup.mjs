/**
 * One command from a C# class library to an installed Graftcode client.
 *
 *   node path/to/graft-setup.mjs [path/to/project.csproj]
 *
 * Run it from the React project folder; the client is installed there.
 *
 * 1. Builds the backend with dotnet.
 * 2. Runs `gg --graftOnly`, which publishes the graft and exits without starting servers.
 * 3. Points the @graft scope at the printed registry in .npmrc and installs the package.
 * 4. Prints the import line and every method signature, so nobody has to open node_modules.
 *
 * gg is taken from GG_PATH, then PATH, then a cached download of the pinned release.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

const GG_VERSION = process.env.GG_VERSION || 'v1.4.14'
const project = process.cwd()

function fail(message) {
  console.error(`graft-setup: ${message}`)
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) fail(`${command} could not start: ${result.error.message}`)
  return result
}

function findFile(dir, names) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      const found = findFile(path, names)
      if (found) return found
    } else if (names.includes(name)) return path
  }
  return null
}

function onPath(name) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.split(/\r?\n/)[0].trim() : null
}

function releaseAsset() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  if (process.platform === 'win32') return `gg_windows_${arch}.zip`
  if (process.platform === 'darwin') return `gg_macos_${process.arch === 'arm64' ? 'arm64' : 'x86_64'}.tar.gz`
  return `gg_linux_${arch}.tar.gz`
}

async function resolveGg() {
  if (process.env.GG_PATH) return process.env.GG_PATH
  const fromPath = onPath('gg')
  if (fromPath) return fromPath

  const cache = join(homedir(), '.graftcode', 'gg', GG_VERSION)
  const names = process.platform === 'win32' ? ['gg.exe'] : ['gg']
  if (existsSync(cache)) {
    const cached = findFile(cache, names)
    if (cached) return cached
  }

  const asset = releaseAsset()
  const url = `https://github.com/grft-dev/graftcode-gateway/releases/download/${GG_VERSION}/${asset}`
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) fail(`download failed with ${response.status}`)
  mkdirSync(cache, { recursive: true })
  const archive = join(cache, asset)
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  const extracted = run('tar', ['-xf', archive, '-C', cache])
  if (extracted.status !== 0) fail(`could not extract ${asset}: ${extracted.stderr}`)
  rmSync(archive, { force: true })
  const binary = findFile(cache, names)
  if (!binary) fail(`${names[0]} not found in ${asset}`)
  if (process.platform !== 'win32') chmodSync(binary, 0o755)
  return binary
}

function findProjectFile() {
  if (process.argv[2]) return resolve(process.argv[2])
  const backend = join(project, 'backend')
  const csproj = existsSync(backend) && readdirSync(backend).find((name) => name.endsWith('.csproj'))
  if (!csproj) fail('pass the .csproj path, or put one in backend/')
  return join(backend, csproj)
}

function signatures(packageDir) {
  const index = readFileSync(join(packageDir, 'index.d.ts'), 'utf8')
  const classes = [...index.matchAll(/import \{ (\w+) \} from "\.\/(\w+)\.js"/g)]
    .map((match) => match[1])
    .filter((name) => name !== 'GraftConfig')
  const lines = []
  for (const name of classes) {
    const file = join(packageDir, `${name}.d.ts`)
    if (!existsSync(file)) continue
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/^\s*static (?!get )(\w+)\(([^)]*)\):\s*([^;]+);/gm)) {
      const params = match[2].replace(/\s+/g, ' ').replace(/,\s*$/, '').trim()
      lines.push(`${name}.${match[1]}(${params}): ${match[3].trim()}`)
    }
    const fields = [...source.matchAll(/^\s*get (\w+)\(\): (.+);$/gm)].filter((match) => match[1] !== 'instance')
    if (fields.length) {
      lines.push(`${name} fields (each may be a Promise): ${fields.map((match) => match[1]).join(', ')}`)
    }
  }
  return { classes, lines }
}

if (!existsSync(join(project, 'package.json'))) fail('run this from the folder that has package.json')

const csproj = findProjectFile()
const assembly = basename(csproj, '.csproj')
const work = mkdtempSync(join(tmpdir(), 'graft-setup-'))
try {
  const out = join(work, 'out')
  const build = run('dotnet', ['build', csproj, '-c', 'Release', '-o', out, '-nologo', '-v', 'q'])
  if (build.status !== 0) fail(`dotnet build failed:\n${build.stdout}${build.stderr}`)
  const dll = join(out, `${assembly}.dll`)
  if (!existsSync(dll)) fail(`${dll} was not produced`)

  const gg = await resolveGg()
  const graft = run(gg, ['--runtime', 'netcore', '--modules', dll, '--graftOnly'], { cwd: work })
  const log = `${graft.stdout}${graft.stderr}`
  const install = log.match(/npm install --registry (\S+) (@graft\/[\w.-]+)@(\S+)/)
  if (graft.status !== 0 || !install) fail(`gg --graftOnly did not print an npm install command:\n${log.slice(-2000)}`)
  const [, registry, packageName, version] = install

  const npmrc = join(project, '.npmrc')
  const kept = existsSync(npmrc)
    ? readFileSync(npmrc, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('@graft:registry='))
    : []
  writeFileSync(npmrc, [...kept, `@graft:registry=${registry}`].join('\n') + '\n')

  const npm = run('npm', ['install', `${packageName}@${version}`, '--no-audit', '--no-fund'], {
    cwd: project,
    shell: process.platform === 'win32',
  })
  if (npm.status !== 0) fail(`npm install failed:\n${npm.stdout}${npm.stderr}`)

  const { classes, lines } = signatures(join(project, 'node_modules', ...packageName.split('/')))
  console.log(`Installed ${packageName}@${version}. The @graft registry is in .npmrc.`)
  console.log('')
  console.log(`import { GraftConfig, ${classes.join(', ')} } from '${packageName}'`)
  console.log(`GraftConfig.host = 'ws://localhost:80/ws'`)
  console.log('')
  for (const line of lines) console.log(line)
  console.log('')
  console.log('Every method returns a Promise. The gateway serves the backend at runtime:')
  console.log(`CMD ["gg", "--runtime", "netcore", "--modules", "/usr/app/${assembly}.dll", "--port", "80"]`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
