import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { getEncoding } from 'js-tiktoken'
import { root } from './workspace.mjs'

const SKIP = new Set(['node_modules', 'bin', 'obj', 'dist', '.cursor', 'graft'])

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, found)
    else found.push(path)
  }
  return found
}

function measure(dir) {
  const encoding = getEncoding('cl100k_base')
  const files = walk(dir).map((path) => {
    const source = readFileSync(path, 'utf8')
    return {
      path: relative(dir, path).replaceAll('\\', '/'),
      lines: source.split(/\r?\n/).filter((line) => line.trim()).length,
      tokens: encoding.encode(source).length,
    }
  })
  files.sort((a, b) => a.path.localeCompare(b.path))
  return {
    files,
    lines: files.reduce((total, file) => total + file.lines, 0),
    tokens: files.reduce((total, file) => total + file.tokens, 0),
  }
}

const projects = join(root, '..', '..', 'official', 'perf-lab', 'results')

/** Every file in a finished project. Rules the agent was given are excluded. */
export function project(name) {
  return measure(join(projects, name))
}

export function starterProject() {
  return measure(join(root, 'starter'))
}

/** Files the agent added or changed in a finished project, compared with the starter. Rules it was given are excluded. */
export function written(name) {
  const dir = join(projects, name)
  const starter = join(root, 'starter')
  const all = measure(dir)
  const files = all.files.filter((file) => {
    const original = join(starter, file.path)
    return !existsSync(original) || readFileSync(original, 'utf8') !== readFileSync(join(dir, file.path), 'utf8')
  })
  return {
    files,
    lines: files.reduce((total, file) => total + file.lines, 0),
    tokens: files.reduce((total, file) => total + file.tokens, 0),
  }
}

export function read(name, path) {
  return readFileSync(join(projects, name, path), 'utf8').replace(/\r\n/g, '\n').trimEnd()
}
