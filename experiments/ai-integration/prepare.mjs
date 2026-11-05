/**
 * Make a workspace you can open in Cursor and try by hand.
 *
 *   node prepare.mjs graftcode ../../../try-graftcode
 *   node prepare.mjs rest ../../../try-rest
 */
import { resolve } from 'node:path'
import { prepare, prompt, techFor } from './workspace.mjs'

const [name, out] = process.argv.slice(2)
if (!name || !out) {
  console.error('Usage: node prepare.mjs <rest|graftcode> <empty folder>')
  process.exit(1)
}

try {
  const tech = techFor(name)
  const dir = resolve(out)
  prepare(tech, dir)
  console.log(`Prepared ${dir}`)
  console.log('')
  console.log('Open that folder in Cursor, start a new Agent chat, and send:')
  console.log('')
  console.log(prompt(tech))
  console.log('')
  console.log('A chat does not write a comparison page. For that, from experiments/ai-integration run: node verify.mjs')
  console.log('It writes .scratch/report.html and opens it. See "Your own comparison page" in the README.')
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
