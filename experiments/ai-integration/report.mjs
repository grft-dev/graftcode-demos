/**
 * Write report.html from runs.
 *
 *   node report.mjs                                  committed runs in results/
 *   node report.mjs --from .scratch --out .scratch/report.html
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { project } from './examples.mjs'
import { groups } from './results.mjs'
import { root } from './workspace.mjs'

const fromIndex = process.argv.indexOf('--from')
const source = join(root, fromIndex === -1 ? 'results' : process.argv[fromIndex + 1])

const n = (value) => (value == null ? '—' : Math.round(value).toLocaleString('en-US'))
const time = (ms) => (ms == null ? '—' : `${Math.round(ms / 1000)} s`)
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function section(group) {
  const rows = [group.rest, group.graftcode].filter(Boolean)
  const max = Math.max(...rows.map((row) => row.medianTotal ?? 0), 1)
  const code = { REST: project('rest'), Graftcode: project('graftcode') }
  const good = group.reduction > 0

  const bars = rows
    .map(
      (row) => `
      <div class="bar-row">
        <div class="bar-name">${esc(row.tech)}</div>
        <div class="track"><div class="fill ${row.tech === 'REST' ? 'rest' : 'graft'}" style="width:${((row.medianTotal ?? 0) / max) * 100}%"></div></div>
        <div class="num">${n(row.medianTotal)}</div>
      </div>`,
    )
    .join('')

  const summary = rows
    .map(
      (row) => `
        <tr>
          <td>${esc(row.tech)}</td>
          <td>${row.passes}/${row.total}</td>
          <td>${n(row.guidanceTokens)}</td>
          <td>${n(row.medianTotal)}</td>
          <td>${n(row.medianInput)}</td>
          <td>${n(row.medianOutput)}</td>
          <td>${time(row.medianMs)}</td>
          <td>${code[row.tech].files.length} files, ${n(code[row.tech].lines)} lines</td>
        </tr>`,
    )
    .join('')

  const runs = rows
    .flatMap((row) =>
      row.runs.map(
        (run) => `
        <tr>
          <td>${esc(row.tech)}</td>
          <td>${run.index}</td>
          <td class="${run.acceptance?.pass ? '' : 'fail'}">${run.acceptance?.pass ? 'pass' : 'fail'}</td>
          <td>${n(run.usage?.totalTokens)}</td>
          <td>${n(run.usage?.inputTokens)}</td>
          <td>${n(run.usage?.outputTokens)}</td>
          <td>${time(run.durationMs)}</td>
          <td class="reason">${esc(run.acceptance?.reason ?? run.status ?? '')}</td>
        </tr>`,
      ),
    )
    .join('')

  return `
    <section>
      <p class="prompt">“${esc(group.template)}”</p>
      <div class="verdict ${good ? 'good' : 'bad'}"><strong>${esc(group.verdict)}</strong>${group.outputReduction != null ? ` Output tokens: ${group.outputReduction}% fewer.` : ''}</div>
      <h3>Median total tokens</h3>
      <div class="bars">${bars}</div>
      <h3>Summary</h3>
      <table>
        <thead><tr><th>Technology</th><th>Passed</th><th>Rule tokens</th><th>Median total</th><th>Median input</th><th>Median output</th><th>Median time</th><th>Project files</th></tr></thead>
        <tbody>${summary}</tbody>
      </table>
      <details>
        <summary>Every run</summary>
        <table>
          <thead><tr><th>Technology</th><th>Run</th><th>Result</th><th>Total</th><th>Input</th><th>Output</th><th>Time</th><th>Acceptance</th></tr></thead>
          <tbody>${runs}</tbody>
        </table>
      </details>
    </section>`
}

const found = groups(source)
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>REST and Graftcode: AI tokens for the same integration</title>
  <style>
    :root { --ink: #1c1917; --muted: #57534e; --line: #e7e5e4; --paper: #fafaf9; --card: #fff; --rest: #0f766e; --graft: #b45309; --bad: #9f1239; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.5 "Segoe UI", system-ui, sans-serif; }
    main { max-width: 1040px; margin: 0 auto; padding: 48px 24px 80px; }
    h1 { font-size: 2rem; line-height: 1.15; margin: 0 0 8px; letter-spacing: -0.02em; }
    h2 { font-size: 1.35rem; margin: 40px 0 6px; }
    h3 { font-size: 1rem; margin: 24px 0 10px; }
    p { margin: 0 0 12px; }
    .lede, .meta, .prompt { color: var(--muted); }
    .meta { font-size: 0.9rem; }
    .prompt { font-style: italic; max-width: 80ch; }
    .verdict { margin: 16px 0; padding: 14px 18px; border-radius: 12px; border: 1px solid; }
    .verdict.good { background: #f0fdfa; border-color: #99f6e4; }
    .verdict.bad { background: #fff1f2; border-color: #fecdd3; }
    table { width: 100%; border-collapse: collapse; background: var(--card); }
    th, td { text-align: right; padding: 8px 10px; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
    th:first-child, td:first-child { text-align: left; }
    td.reason { text-align: left; color: var(--muted); font-size: 0.85rem; }
    th { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
    .bars { display: grid; gap: 12px; }
    .bar-row { display: grid; grid-template-columns: 140px 1fr 96px; gap: 12px; align-items: center; }
    .track { height: 14px; background: var(--line); border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; }
    .fill.rest { background: var(--rest); }
    .fill.graft { background: var(--graft); }
    .num { font-variant-numeric: tabular-nums; font-weight: 650; text-align: right; }
    .fail { color: var(--bad); }
    details { margin-top: 16px; }
    summary { cursor: pointer; color: var(--muted); }
    code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
  </style>
</head>
<body>
  <main>
    <p class="meta">${esc([...new Set(found.map((group) => group.model))].join(', '))} · generated by <code>node report.mjs</code></p>
    <h1>AI tokens to integrate the same 20 C# methods: REST and Graftcode</h1>
    <p class="lede">Cursor's agent gets the same starter project and the same prompt. The only difference is the project rule: a REST rule (controller, request, and response per method, plus a typed fetch client), or a Graftcode rule with the generated method list. The C# business logic stays unchanged. Token counts are what the Cursor SDK reported.</p>
    ${found.map(section).join('\n')}
    <h2>Try it yourself</h2>
    <p>From <code>experiments/ai-integration</code>, run <code>npm install</code> and <code>node verify.mjs</code>. It runs both agents and writes <code>.scratch/report.html</code>, which is this page for your own runs. To send the prompt yourself in a Cursor chat, use <code>node prepare.mjs</code>. A chat does not write this page.</p>
  </main>
</body>
</html>
`

const outIndex = process.argv.indexOf('--out')
const outArg = outIndex === -1 || !process.argv[outIndex + 1] ? 'report.html' : process.argv[outIndex + 1]
const outFile = isAbsolute(outArg) ? outArg : join(root, outArg)
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, html)
console.log('Wrote', outFile)
