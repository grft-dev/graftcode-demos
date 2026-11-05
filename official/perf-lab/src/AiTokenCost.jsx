import data from './metrics/ai-token-cost.json'

const STACKS = ['rest', 'graftcode']
const REPO = 'https://github.com/grft-dev/graftcode-demos/tree/main/'
const PROJECTS = 'official/perf-lab/results'
const BLOB = 'https://github.com/grft-dev/graftcode-demos/blob/main/'

const number = (value) => Math.round(value).toLocaleString('en-US')

function Snippet({ snippet, open }) {
  return (
    <details className="snippet" open={open}>
      <summary>
        <span>{snippet.title}</span>
        <span className="snippet-count">{snippet.tokens} tokens</span>
      </summary>
      <p className="snippet-path">{snippet.path}</p>
      <pre><code>{snippet.source}</code></pre>
    </details>
  )
}

function TokenBars() {
  const rows = STACKS.map((stack) => data.stacks[stack])
  const max = Math.max(...rows.map((row) => row.totalTokens), 1)
  return (
    <div className="token-bars">
      <h4>Median total tokens</h4>
      {rows.map((row) => (
        <div className="token-bar-row" key={row.name}>
          <div className="token-bar-name">{row.name}</div>
          <div className="token-bar-track" role="presentation">
            <div
              className={`token-bar-fill token-bar-fill--${row.name === 'REST' ? 'rest' : 'graft'}`}
              style={{ width: `${(row.totalTokens / max) * 100}%` }}
            />
          </div>
          <div className="token-bar-num">{number(row.totalTokens)}</div>
        </div>
      ))}
    </div>
  )
}

export function AiTokenCost() {
  const { rest, graftcode } = data.stacks
  const path = data.repoPath

  return (
    <section className="code-metrics" data-testid="ai-token-cost">
      <h3>Code &amp; AI Token Cost</h3>
      <p>
        Cursor&apos;s agent connected the same 20 C# business methods to a React page, once with REST and once with
        Graftcode. Both started from the same project, read the same C# methods, and left that business logic
        unchanged. Neither side was given a method list. The only difference was the project rule. REST exposes
        each method as an HTTP endpoint with its own request type and response type, one C# type per file, and a
        typed <code>fetch</code> client. Graftcode called the generated client directly, using the C# name with a
        lowercase first letter.
      </p>

      <TokenBars />

      <div className="metrics-table-wrap">
        <table className="metrics-table">
          <thead>
            <tr>
              <th scope="col">Technology</th>
              <th scope="col">AI tokens</th>
              <th scope="col">Output tokens</th>
              <th scope="col">Project files</th>
              <th scope="col">Lines</th>
            </tr>
          </thead>
          <tbody>
            {STACKS.map((stack) => {
              const item = data.stacks[stack]
              return (
                <tr key={stack} className={stack === 'graftcode' ? 'winner' : undefined}>
                  <td>{item.name}</td>
                  <td data-testid={`${stack}-total-tokens`}>{number(item.totalTokens)}</td>
                  <td data-testid={`${stack}-output-tokens`}>{number(item.outputTokens)}</td>
                  <td data-testid={`${stack}-files`}>{item.files}</td>
                  <td data-testid={`${stack}-lines`}>{number(item.lines)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="callout">
        <strong data-testid="token-reduction">Graftcode used {data.reduction}% fewer AI tokens than REST</strong>
        <p>
          The finished REST project is {rest.files} files. The Graftcode project is {graftcode.files}. Both include the same {data.starterFiles}-file starter, the C# business logic and the React page. REST then adds a request type, a response type, and an endpoint per method. Graftcode adds the calls and a Dockerfile. Its client is generated from the C# library and is not included here. Output tokens were {data.outputReduction}% fewer.
        </p>
      </div>

      <h4>One method, both ways: <code>BillingLogic.CalculateTax</code></h4>
      <div className="metric-columns token-columns">
        <div className="metric-column">
          <h4>{rest.name}</h4>
          {data.snippets.rest.map((snippet) => <Snippet key={snippet.path} snippet={snippet} open />)}
        </div>
        <div className="metric-column">
          <h4>{graftcode.name}</h4>
          {data.snippets.graftcode.map((snippet) => <Snippet key={snippet.path} snippet={snippet} open />)}
        </div>
      </div>

      <h4>Rules the agent was given</h4>
      <div className="metric-columns token-columns">
        {STACKS.map((stack) => (
          <div key={stack} className="metric-column">
            {data.stacks[stack].rules.map((rule) => (
              <Snippet key={rule.path} snippet={{ title: rule.path.split('/').pop(), ...rule }} open={false} />
            ))}
          </div>
        ))}
      </div>

      <div className="verify-box">
        <h4>Try it yourself</h4>
        <pre><code>{`git clone https://github.com/grft-dev/graftcode-demos.git
cd graftcode-demos/${path}
npm install
node verify.mjs`}</code></pre>
        <p>
          <code>verify.mjs</code> runs the agent for REST and for Graftcode, three times each, checks that every method
          is wired, and writes <code>.scratch/report.html</code>. It opens that page. The page shows the median tokens,
          every run, and how many passed. This bills your Cursor account. Sign in with the Cursor SDK, or set{' '}
          <code>CURSOR_API_KEY</code>. Add <code>--runs 5</code> to change how many times each side runs.
        </p>
        <p>
          To send the prompt yourself in a Cursor chat instead, run{' '}
          <code>node prepare.mjs graftcode ../../../try-graftcode</code> and the same command for rest. A chat does not
          write this page. The{' '}
          <a href={`${REPO}${path}/rules`} target="_blank" rel="noopener noreferrer">rules</a> are a starting point you can
          change to match your team&apos;s standards, and the{' '}
          <a href={`${REPO}${PROJECTS}`} target="_blank" rel="noopener noreferrer">results</a> show what the agent
          wrote with each one.
        </p>
      </div>

      <div className="metrics-footnote">
        <p>
          Prompt: “{data.prompt}” Token counts are medians reported by the Cursor SDK for <code>{data.model}</code>.
          REST is 8 runs of this rule. Graftcode is 5 runs of the current rule. Two earlier Graftcode batches, before the rule named the image tag <code>graftcode/netcore:10.0</code> and the Vite <code>esnext</code> target, had medians of 86,759 and 59,424. Combined, those 8 runs have a median of 72,314.
          File and line counts are the whole finished project, including that shared starter. The rules the agent was given are not included.
        </p>
        <p>
          <a href={`${BLOB}${path}/README.md`} target="_blank" rel="noopener noreferrer">How it works</a>
          {' · '}
          <a href={`${REPO}${path}/results`} target="_blank" rel="noopener noreferrer">Recorded runs</a>
          {' · '}
          <a href={`${REPO}${PROJECTS}`} target="_blank" rel="noopener noreferrer">REST and Graftcode results</a>
        </p>
      </div>
    </section>
  )
}
