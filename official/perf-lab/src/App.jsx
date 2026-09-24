import { useState, useEffect } from 'react'
import './App.css'
import { GraftConfig, EnergyPriceService } from '@graft/nuget-EnergyPriceService'
import { Button, Checkbox, Select } from '@graftcode/design-system'
import { callGrpcGetPrice, callGrpcGetPriceHistory, streamGrpcPrices } from './grpcClient'
import locMetrics from './metrics/loc-comparison.json'

const metricsDocUrl =
  'https://github.com/grft-dev/graftcode-demos/blob/main/official/perf-lab/src/metrics/METRICS.md'
const measureScriptUrl =
  'https://github.com/grft-dev/graftcode-demos/blob/main/scripts/measure-integration-metrics.mjs'

// Static counts, measured once by scripts/measure-integration-metrics.mjs over the
// same getPrice/getPriceHistory path the benchmark above calls at runtime.
const codeSlice = locMetrics.tables.energyPriceSlice
const codeRows = ['rest', 'grpc', 'graftcode'].map((key) => {
  const stack = codeSlice.stacks[key]
  return {
    key,
    name: stack.name,
    sloc: stack.sloc.code,
    tokens: stack.tokens_cl100k,
    glueSloc: stack.sloc_integration_plus_client,
  }
})
const codeBaseline = codeRows.find((row) => row.key === 'graftcode')

function round1(ms) {
  return Math.round(ms * 10) / 10
}

function payloadSpeedCallout({ graft, unary, rest, stream }) {
  if ([graft, unary, rest, stream].some((v) => v == null || v <= 0)) return null

  const vsRestPct = ((rest - graft) / rest) * 100
  const restClause = vsRestPct >= 0
    ? `${vsRestPct.toFixed(1)}% faster than REST`
    : `${Math.abs(vsRestPct).toFixed(1)}% slower than REST`

  const relUnary = Math.abs(graft - unary) / unary
  let unaryClause
  if (relUnary <= 0.1) {
    unaryClause = 'comparable to gRPC unary'
  } else if (graft > unary) {
    unaryClause = `${round1(graft - unary)} ms behind gRPC unary`
  } else {
    unaryClause = `${round1(unary - graft)} ms ahead of gRPC unary`
  }

  const streamDelta = round1(Math.abs(stream - graft))
  const streamNote = graft < stream
    ? `gRPC server-streaming is a different pattern (one message per point); Graftcode was ${streamDelta} ms faster on this run.`
    : `gRPC server-streaming is a different pattern (one message per point); it was ${streamDelta} ms faster on this run.`

  return {
    headline: `Graftcode is ${restClause} and ${unaryClause}.`,
    streamNote,
  }
}

function App() {
  const currencyOptions = [
    { type: 'item', value: 'EUR', label: 'EUR' },
    { type: 'item', value: 'USD', label: 'USD' },
  ]
  const rpsOptions = [
    { type: 'item', value: '100', label: '100 RPS' },
    { type: 'item', value: '500', label: '500 RPS' },
    { type: 'item', value: '1000', label: '1k RPS' },
    { type: 'item', value: '5000', label: '5k RPS' },
    { type: 'item', value: '10000', label: '10k RPS' },
    { type: 'item', value: '50000', label: '50k RPS' },
    { type: 'item', value: '100000', label: '100k RPS' },
    { type: 'item', value: '200000', label: '200k RPS' },
    { type: 'item', value: '500000', label: '500k RPS' },
    { type: 'item', value: '1000000', label: '1M RPS' },
    { type: 'item', value: '2000000', label: '2M RPS' },
  ]
  const cloudProviderOptions = [
    { type: 'item', value: 'Azure', label: 'Azure' },
    { type: 'item', value: 'AWS', label: 'AWS' },
    { type: 'item', value: 'Google Cloud Platform', label: 'Google Cloud Platform' },
  ]
  const integrationTechOptions = [
    { type: 'item', value: 'REST', label: 'REST' },
    { type: 'item', value: 'gRPC', label: 'gRPC' },
    { type: 'item', value: 'Graftcode', label: 'Graftcode' },
  ]

  const payloadCountOptions = [
    { type: 'item', value: '1000', label: '1,000 prices' },
    { type: 'item', value: '5000', label: '5,000 prices' },
    { type: 'item', value: '20000', label: '20,000 prices' },
    { type: 'item', value: '50000', label: '50,000 prices' },
  ]

  const [currency, setCurrency] = useState('EUR')
  const [graftError, setGraftError] = useState(null)
  const [price, setPrice] = useState(0)

  const [excludeNetworkLatency, setExcludeNetworkLatency] = useState(true)
  const [showLatencyExplanation, setShowLatencyExplanation] = useState(false)

  const [payloadCount, setPayloadCount] = useState(5000)
  const [isRunningPayload, setIsRunningPayload] = useState(false)
  const [payloadError, setPayloadError] = useState(null)
  const [restHistoryMs, setRestHistoryMs] = useState(null)
  const [restHistoryKb, setRestHistoryKb] = useState(null)
  const [grpcHistoryMs, setGrpcHistoryMs] = useState(null)
  const [grpcStreamMs, setGrpcStreamMs] = useState(null)
  const [graftHistoryMs, setGraftHistoryMs] = useState(null)
  const [restBaselineMs, setRestBaselineMs] = useState(null)
  const [grpcBaselineMs, setGrpcBaselineMs] = useState(null)
  const [graftBaselineMs, setGraftBaselineMs] = useState(null)

  const [rps, setRps] = useState(200000)
  const [cloudProvider, setCloudProvider] = useState('Azure')
  const [integrationTech, setIntegrationTech] = useState('REST')

  useEffect(() => {
    try {
      const h2Path = import.meta.env.VITE_GRAFT_H2_PATH ?? '/graft/h2'
      // gg 1.4.6 RST_STREAMs Node http2 POST /h2 (PROTOCOL_ERROR) — same as the
      // official hypertube Node client. Browser HTTP/2 still goes through the
      // Vite h2c plugin when VITE_GRAFT_TRANSPORT=h2. Default is same-origin
      // WSS → gg WebSocket so HTTPS pages are not mixed-content blocked.
      if (import.meta.env.VITE_GRAFT_TRANSPORT === 'h2') {
        GraftConfig.host = `${window.location.origin}${h2Path}`
      } else {
        const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        GraftConfig.host = import.meta.env.VITE_GRAFT_WS_URL || `${wsProto}://${window.location.host}/graft-ws`
      }
      GraftConfig.stateless = true
    } catch (err) {
      setGraftError(err?.message || 'Failed to initialize GraftConfig')
    }
  }, [])

  const getEnergyPrice = async () => {
    try {
      const calculatedPrice = await EnergyPriceService.getPrice()
      setPrice(calculatedPrice)
    } catch (err) {
      setGraftError(err?.message || 'getPrice failed')
    }
  }

  // Per-request overhead of one channel, measured with a call that returns a
  // single value. The first call is discarded because it also pays for the
  // TLS/WebSocket handshake, which is not a per-request cost.
  const measureBaseline = async (call, runs = 3) => {
    await call()
    let best = Infinity
    for (let i = 0; i < runs; i++) {
      const t = performance.now()
      await call()
      best = Math.min(best, performance.now() - t)
    }
    return round1(best)
  }

  const sharedRttMs =
    restBaselineMs != null && grpcBaselineMs != null && graftBaselineMs != null
      ? Math.min(restBaselineMs, grpcBaselineMs, graftBaselineMs)
      : null

  const adjustForLatency = (time) => {
    if (!excludeNetworkLatency || time === null || sharedRttMs === null) return time
    return round1(Math.max(0, time - sharedRttMs))
  }

  const msForTech = (tech) => {
    if (tech === 'REST') return adjustForLatency(restHistoryMs)
    if (tech === 'gRPC') return adjustForLatency(grpcHistoryMs)
    if (tech === 'Graftcode') return adjustForLatency(graftHistoryMs)
    return null
  }

  const runPayloadComparison = async () => {
    setIsRunningPayload(true)
    setPayloadError(null)
    setRestHistoryMs(null)
    setRestHistoryKb(null)
    setGrpcHistoryMs(null)
    setGrpcStreamMs(null)
    setGraftHistoryMs(null)
    setRestBaselineMs(null)
    setGrpcBaselineMs(null)
    setGraftBaselineMs(null)
    try {
      const restHost = import.meta.env.VITE_REST_URL || 'https://localhost:8090'
      const grpcBase = import.meta.env.VITE_GRPC_URL || 'https://localhost:5005'

      // REST: one GET returning a JSON array of prices, matching gRPC/Graftcode.
      setRestBaselineMs(await measureBaseline(() => fetch(`${restHost}/api/EnergyPrice/price`).then(r => r.text())))
      let t = performance.now()
      const resp = await fetch(`${restHost}/api/EnergyPrice/history?count=${payloadCount}`)
      const text = await resp.text()
      const restPoints = JSON.parse(text)
      void restPoints.length
      setRestHistoryMs(round1(performance.now() - t))
      setRestHistoryKb(Math.round(text.length / 1024))

      // gRPC unary: one call returning packed repeated doubles.
      setGrpcBaselineMs(await measureBaseline(() => callGrpcGetPrice(grpcBase)))
      t = performance.now()
      await callGrpcGetPriceHistory(grpcBase, payloadCount)
      setGrpcHistoryMs(round1(performance.now() - t))

      // gRPC server-streaming: same count of prices, one wrapped double per message.
      t = performance.now()
      await streamGrpcPrices(grpcBase, payloadCount)
      setGrpcStreamMs(round1(performance.now() - t))

      // Graftcode: remote Hypertube call via GraftConfig.host (WSS by default,
      // or HTTPS/h2 when VITE_GRAFT_TRANSPORT=h2).
      setGraftBaselineMs(await measureBaseline(() => EnergyPriceService.getPrice()))
      t = performance.now()
      const graftPoints = await EnergyPriceService.getPriceHistory(payloadCount)
      void graftPoints.length
      setGraftHistoryMs(round1(performance.now() - t))
    } catch (err) {
      setPayloadError(err?.message || 'Request failed — are the backends running?')
    } finally {
      setIsRunningPayload(false)
    }
  }

  // Cloud instance pricing (per hour in USD) — high-performance production instances
  const cloudPricing = {
    Azure: {
      'Standard_D8s_v5': 0.384,
      'Standard_D16s_v5': 0.768,
      'Standard_D32s_v5': 1.536,
    },
    AWS: {
      'c6i.2xlarge': 0.3408,
      'c6i.4xlarge': 0.6816,
      'c6i.8xlarge': 1.3632,
    },
    'Google Cloud Platform': {
      'c2-standard-8': 0.2688,
      'c2-standard-16': 0.5376,
      'c2-standard-32': 1.0752,
    },
  }

  const calculateCostSavings = () => {
    const currentMs = msForTech(integrationTech)
    if (currentMs === null) return null

    // Find the fastest of the other two measured technologies
    const others = ['REST', 'gRPC', 'Graftcode'].filter(t => t !== integrationTech)
    const candidates = others
      .map(t => ({ name: t, ms: msForTech(t) }))
      .filter(c => c.ms !== null && c.ms < currentMs)
    if (candidates.length === 0) return null
    const best = candidates.reduce((a, b) => a.ms < b.ms ? a : b)
    const targetMs = best.ms
    const targetName = best.name

    if (targetMs >= currentMs) return null

    const timeSavedMs = currentMs - targetMs
    const timeSavedPerRequestS = timeSavedMs / 1000
    const secondsInYear = 365 * 24 * 3600
    const totalTimeSavedHours = (timeSavedPerRequestS * rps * secondsInYear) / 3600

    const defaultInstances = {
      Azure: 'Standard_D16s_v5',
      AWS: 'c6i.4xlarge',
      'Google Cloud Platform': 'c2-standard-16',
    }
    const instanceType = defaultInstances[cloudProvider] || 'Standard_D16s_v5'
    const hourlyCost = cloudPricing[cloudProvider]?.[instanceType] || 0.768
    const annualCostSavings = totalTimeSavedHours * hourlyCost

    return { timeSavedPerRequestMs: timeSavedMs, totalTimeSavedHours, annualCostSavings, instanceType, targetName, currentMs, targetMs }
  }

  const formatPayloadResult = (label, ms, kb, channelPingMs) => {
    if (ms === null) return <span>{label}: <span className="muted">—</span></span>
    const adj = adjustForLatency(ms)
    return (
      <span>
        {label}: <strong>{adj} ms</strong>
        {kb != null ? ` (${kb} KB)` : ''}
        {excludeNetworkLatency && sharedRttMs !== null && (
          <span className="latency-breakdown">
            {' '}({ms} ms − {sharedRttMs} ms shared RTT
            {channelPingMs != null && channelPingMs !== sharedRttMs
              ? `; channel ${channelPingMs} ms`
              : ''}
            )
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="perf-app">
      {graftError && (
        <div className="graft-error" role="alert">
          GraftConfig init failed: {graftError}. Running locally, the backend may be unreachable.
        </div>
      )}

      <header className="hero">
        <h1>Graftcode vs REST and gRPC Performance Lab</h1>
        <p>Measure three remote paths to the same .NET runtime: REST/JSON, gRPC/protobuf, and Graftcode through the gateway (WSS, or HTTPS/h2 when configured).</p>
      </header>

      <section className="price-section">
        <div className="inline">
          <span className="label">Current energy price:</span>
          <strong className="value">{price} {currency}/kWh</strong>
        </div>
        <div className="controls">
          <Select
            id="currency-select"
            aria-label="Currency"
            value={currency}
            options={currencyOptions}
            onValueChange={setCurrency}
          />
          <Button variant="primary" onClick={getEnergyPrice}>Fetch One Price</Button>
        </div>
      </section>

      <section className="payload-comparison">
        <div className="payload-header">
          <div>
            <h2>Large Payload &amp; Streaming</h2>
            <p>One request returning the same array of prices. REST uses HTTP/2+JSON, gRPC uses HTTP/2+protobuf, and Graftcode is a remote Hypertube call through the gateway (WSS by default, or HTTPS/h2 when VITE_GRAFT_TRANSPORT=h2).</p>
          </div>
          <div className="latency-controls">
            <div className="latency-row">
              <Checkbox
                id="exclude-network-latency"
                checked={excludeNetworkLatency}
                onChange={(next) => setExcludeNetworkLatency(next === true)}
                label="Exclude Network Latency"
              />
            </div>
            <Button
              variant="outlined"
              className="info-link"
              onClick={() => setShowLatencyExplanation(!showLatencyExplanation)}
            >
              Why it matters?
            </Button>
          </div>
        </div>

        <div className="payload-controls">
          <Select
            id="payload-count-select"
            label="Points per call:"
            value={String(payloadCount)}
            options={payloadCountOptions}
            onValueChange={(value) => setPayloadCount(Number(value))}
          />
          <Button variant="primary" onClick={runPayloadComparison} disabled={isRunningPayload}>
            {isRunningPayload ? 'Running…' : 'Run comparison'}
          </Button>
        </div>

        {payloadError && (
          <div className="payload-error" role="alert">{payloadError}</div>
        )}

        <div className="summary">
          <div>{formatPayloadResult('REST (JSON)', restHistoryMs, restHistoryKb, restBaselineMs)}</div>
          <div>{formatPayloadResult('gRPC unary (protobuf)', grpcHistoryMs, null, grpcBaselineMs)}</div>
          <div>{formatPayloadResult('gRPC stream (protobuf)', grpcStreamMs, null, grpcBaselineMs)}</div>
          <div>{formatPayloadResult('Graftcode (Hypertube)', graftHistoryMs, null, graftBaselineMs)}</div>
        </div>

        {(restHistoryMs !== null && grpcHistoryMs !== null && grpcStreamMs !== null && graftHistoryMs !== null) && (() => {
          const copy = payloadSpeedCallout({
            graft: adjustForLatency(graftHistoryMs),
            unary: adjustForLatency(grpcHistoryMs),
            rest: adjustForLatency(restHistoryMs),
            stream: adjustForLatency(grpcStreamMs),
          })
          if (!copy) return null
          return (
            <div className="callout payload-callout">
              <strong>{copy.headline}</strong>
              <p>{copy.streamNote}</p>
            </div>
          )
        })()}
      </section>

      {showLatencyExplanation && (
        <div className="explanation-popup-overlay">
          <div className="explanation-popup">
            <p>
              <strong>Why Excluding Network Latency Matters:</strong>
            </p>
            <p>
              Each path has its own ping. Subtracting a per-channel baseline would punish the fastest ping (often Graftcode) and inflate its “processing” time relative to REST and gRPC.
            </p>
            <p>
              Instead we subtract one <strong>shared RTT</strong> from every result: the shortest measured <code>getPrice</code> ping across the three channels. That isolates payload cost without changing rank order. Raw time and the shared RTT are shown next to each row; a higher channel ping is informational only.
            </p>
            <Button
              variant="secondary"
              className="close-explanation"
              onClick={() => setShowLatencyExplanation(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <section className="cost-savings">
        <h3>Cloud Cost Savings</h3>
        <p>Estimate the annual compute savings from switching technologies based on the payload test results and your request volume.</p>

        <div className="cost-controls">
          <div className="control-group">
            <Select
              id="rps-select"
              label="Large-payload requests per second (RPS):"
              value={String(rps)}
              options={rpsOptions}
              onValueChange={(value) => setRps(Number(value))}
            />
          </div>
          <div className="control-group">
            <Select
              id="cloud-provider-select"
              label="Cloud Provider:"
              value={cloudProvider}
              options={cloudProviderOptions}
              onValueChange={setCloudProvider}
            />
          </div>
          <div className="control-group">
            <Select
              id="integration-tech-select"
              label="Current Integration Technology:"
              value={integrationTech}
              options={integrationTechOptions}
              onValueChange={setIntegrationTech}
            />
          </div>
        </div>

        {(() => {
          const savings = calculateCostSavings()
          if (!savings) {
            const hasPayloadResults =
              restHistoryMs !== null && grpcHistoryMs !== null && graftHistoryMs !== null
            return (
              <div className="cost-results">
                <p className="muted">
                  {hasPayloadResults
                    ? `No faster measured alternative to ${integrationTech}.`
                    : 'Run the payload comparison above to see cost savings calculations.'}
                </p>
              </div>
            )
          }
          return (
            <div className="cost-results">
              <h4>Annual Cost Savings ({integrationTech} → {savings.targetName})</h4>
              <div className="savings-breakdown">
                <div className="savings-item">
                  <span className="label">Time saved per request:</span>
                  <span className="value">{savings.timeSavedPerRequestMs} ms</span>
                </div>
                <div className="savings-item">
                  <span className="label">Total requests per year:</span>
                  <span className="value">{(rps * 365 * 24 * 3600).toLocaleString()}</span>
                </div>
                <div className="savings-item">
                  <span className="label">Total compute time saved annually:</span>
                  <span className="value">{savings.totalTimeSavedHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hours</span>
                </div>
                <div className="savings-item">
                  <span className="label">Instance type:</span>
                  <span className="value">{savings.instanceType}</span>
                </div>
                <div className="savings-item highlight">
                  <span className="label">Annual cost savings:</span>
                  <span className="value">${savings.annualCostSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
              </div>
              <div className="savings-note">
                <p><em>Based on {rps.toLocaleString()} RPS, {cloudProvider} {savings.instanceType} pricing, and measured {integrationTech} vs {savings.targetName} performance difference{excludeNetworkLatency ? ' (network latency excluded)' : ''}.</em></p>
              </div>
            </div>
          )
        })()}
      </section>

      <section className="code-metrics">
        <h3>Code &amp; AI Token Cost</h3>
        <p>How much integration code a developer (or an AI assistant) has to write for the same <code>getPrice</code> / <code>getPriceHistory</code> calls benchmarked above. Counted once from the committed source — this table does not change when you run the comparison.</p>

        <div className="metrics-table-wrap">
          <table className="metrics-table">
            <thead>
              <tr>
                <th scope="col">Technology</th>
                <th scope="col">Lines of code</th>
                <th scope="col">AI tokens</th>
                <th scope="col">vs Graftcode</th>
              </tr>
            </thead>
            <tbody>
              {codeRows.map((row) => (
                <tr key={row.key} className={row.key === 'graftcode' ? 'winner' : undefined}>
                  <td>{row.name}</td>
                  <td>{row.sloc.toLocaleString()}</td>
                  <td>{row.tokens.toLocaleString()}</td>
                  <td>
                    {row.key === 'graftcode'
                      ? 'baseline'
                      : `${(row.sloc / codeBaseline.sloc).toFixed(1)}x`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="callout">
          <strong>
            Graftcode needs {codeSlice.reductions.rest_to_graftcode.sloc_integration_plus_client}% less
            integration code than REST and {codeSlice.reductions.grpc_to_graftcode.sloc_integration_plus_client}% less than gRPC
          </strong>
        </div>

        <div className="metrics-footnote">
          <p>
            Static one-shot measurement of the same <code>getPrice</code> / <code>getPriceHistory</code> path
            (this table is not recomputed when you run the comparison). SLOC is a custom cloc-style scan of
            committed source — <code>//</code> and <code>/* */</code> comments and blank lines excluded.
            AI tokens are <code>js-tiktoken</code> <strong>cl100k_base</strong> on those same files: a proxy for
            handwritten integration code, not tokens from a live agent session. Graftcode AI rules are not
            added. Generated clients, <code>protoc</code> C#, <code>gg</code> / Kestrel binaries,{' '}
            <code>node_modules</code>, and <code>BusinessLogic.cs</code> (unused by this lab) are not counted.
          </p>
          <p>
            Captured {new Date(locMetrics.measuredAt).toISOString().slice(0, 10)} at git{' '}
            <code>{String(locMetrics.gitSha).slice(0, 7)}</code>.{' '}
            <a href={metricsDocUrl} target="_blank" rel="noopener noreferrer">Methodology (METRICS.md)</a>
            {' · '}
            <a href={measureScriptUrl} target="_blank" rel="noopener noreferrer">Measurement script</a>
          </p>
        </div>
      </section>
    </div>
  )
}

export default App
