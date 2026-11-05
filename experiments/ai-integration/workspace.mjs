import { cpSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = dirname(fileURLToPath(import.meta.url))

export const TECHS = {
  rest: { label: 'REST', rules: join(root, 'rules', 'rest') },
  graftcode: { label: 'Graftcode', rules: join(root, 'rules', 'graftcode') },
}

export function techFor(name) {
  const tech = TECHS[name]
  if (!tech) throw new Error(`Unknown technology "${name ?? ''}". Choose: ${Object.keys(TECHS).join(', ')}`)
  return tech
}

export function prompt(tech) {
  return readFileSync(join(root, 'prompt.txt'), 'utf8').trim().replaceAll('{TECH}', tech.label)
}

export function methods() {
  return JSON.parse(readFileSync(join(root, 'methods.json'), 'utf8'))
}

export function ruleFiles(tech, dir = tech.rules, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) ruleFiles(tech, path, found)
    else found.push(path)
  }
  return found
}

/** Copy the starter project and one technology's rules into an empty folder. */
export function prepare(tech, dir) {
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty`)
  cpSync(join(root, 'starter'), dir, { recursive: true })
  cpSync(tech.rules, dir, { recursive: true })
}

/** The starter must not hint at either technology, so the rules are the only difference. */
export function assertNeutralStarter() {
  const hits = []
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) visit(path)
      else if (/graft|gateway/i.test(readFileSync(path, 'utf8'))) hits.push(path)
    }
  }
  visit(join(root, 'starter'))
  if (hits.length) throw new Error('Starter mentions graft or gateway:\n' + hits.join('\n'))
}
