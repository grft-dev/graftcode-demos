import { useState, useEffect } from 'react'
import './App.css'
import { GraftConfig, EnergyPriceService } from '@graft/nuget-energypriceservice'
import { Button, Checkbox, Select } from '@graftcode/design-system'
import { callGrpcGetPrice, streamGrpcPrices } from './grpcClient'
import {
  applyGraftConfigHost,
  HTTP_BACKEND_MODE_OPTIONS,
  isHttpBackendSwitchAvailable,
  loadHttpBackendMode,
  resolveHttpBackendGrpcUrl,
  resolveHttpBackendRestUrl,
  saveHttpBackendMode,
} from './httpBackendConfig'
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

const BENCHMARK_PATH_ORDER = ['rest', 'grpcUnary', 'grpcStream', 'graftcode']

const BENCHMARK_PATH_META = {
  rest: { label: 'REST (JSON)' },
  grpcUnary: { label: 'gRPC unary (protobuf)' },
  grpcStream: { label: 'gRPC stream (protobuf)' },
  graftcode: { label: 'Graftcode' },
}

function createIdleBenchmarkPaths(total = 0) {
  return Object.fromEntries(
    BENCHMARK_PATH_ORDER.map((key) => [key, { phase: 'idle', current: 0, total }])
  )
}

const BENCHMARK_PHASE_LABEL = {
  idle: 'Waiting',
  pending: 'Queued',
  baseline: 'Measuring RTT…',
  running: 'Running',
  done: 'Done',
  error: 'Failed',
}

function pctDelta(fasterMs, slowerMs) {
  if (fasterMs == null || slowerMs == null || slowerMs <= 0) return null
  return Math.round(((slowerMs - fasterMs) / slowerMs) * 1000) / 10
}

function GraftcodeSpeedSummary({ results, contextNote }) {
  const graft = results.find((r) => r.name === 'Graftcode')
  if (!graft || graft.ms == null || graft.ms <= 0) return null

  const others = results.filter((r) => r.name !== 'Graftcode' && r.ms != null && r.ms > 0)
  if (!others.length) return null

  return (
    <div className="speed-summary">
      <h3 className="speed-summary-title">How Graftcode compares</h3>
      {contextNote ? <p className="speed-summary-note">{contextNote}</p> : null}
      <p className="speed-summary-anchor">
        Graftcode baseline: <strong>{graft.ms} ms</strong> per call
      </p>
      <ul className="speed-summary-list">
        {others.map((other) => {
          const graftFaster = graft.ms < other.ms
          const pct = graftFaster
            ? pctDelta(graft.ms, other.ms)
            : pctDelta(other.ms, graft.ms)
          if (pct == null) return null
          return (
            <li
              key={other.name}
              className={`speed-summary-row ${graftFaster ? 'speed-summary-row--faster' : 'speed-summary-row--slower'}`}
            >
              <span className="speed-summary-tech">{other.name}</span>
              <span className="speed-summary-ms">{other.ms} ms/call</span>
              <span className="speed-summary-verdict">
                {graftFaster ? (
                  <>
                    Graftcode <strong>{pct}%</strong> faster
                  </>
                ) : (
                  <>
                    Graftcode <strong>{pct}%</strong> slower
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
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

  const benchmarkCountOptions = [
    { type: 'item', value: '100', label: '100 calls' },
    { type: 'item', value: '500', label: '500 calls' },
    { type: 'item', value: '1000', label: '1,000 calls' },
    { type: 'item', value: '5000', label: '5,000 calls' },
  ]

  const [currency, setCurrency] = useState('EUR')
  const [graftError, setGraftError] = useState(null)
  const [price, setPrice] = useState(0)

  const [excludeNetworkLatency, setExcludeNetworkLatency] = useState(true)
  const [showLatencyExplanation, setShowLatencyExplanation] = useState(false)

  const [benchmarkCount, setBenchmarkCount] = useState(1000)
  const [benchmarkCountUsed, setBenchmarkCountUsed] = useState(null)
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false)
  const [benchmarkError, setBenchmarkError] = useState(null)
  const [benchmarkPaths, setBenchmarkPaths] = useState(() => createIdleBenchmarkPaths())
  const [restManyTotalMs, setRestManyTotalMs] = useState(null)
  const [grpcManyTotalMs, setGrpcManyTotalMs] = useState(null)
  const [grpcStreamManyTotalMs, setGrpcStreamManyTotalMs] = useState(null)
  const [graftManyTotalMs, setGraftManyTotalMs] = useState(null)
  const [restManyBaselineMs, setRestManyBaselineMs] = useState(null)
  const [grpcManyBaselineMs, setGrpcManyBaselineMs] = useState(null)
  const [grpcStreamManyBaselineMs, setGrpcStreamManyBaselineMs] = useState(null)
  const [graftManyBaselineMs, setGraftManyBaselineMs] = useState(null)

  const [rps, setRps] = useState(200000)
  const [cloudProvider, setCloudProvider] = useState('Azure')
  const [integrationTech, setIntegrationTech] = useState('REST')

  const httpBackendSwitchVisible = isHttpBackendSwitchAvailable()
  const [httpBackendMode, setHttpBackendMode] = useState(() => loadHttpBackendMode())
  const restBaseUrl = resolveHttpBackendRestUrl(httpBackendMode)
  const grpcBaseUrl = resolveHttpBackendGrpcUrl(httpBackendMode)

  const onHttpBackendModeChange = (value) => {
    setHttpBackendMode(value)
    saveHttpBackendMode(value)
  }

  useEffect(() => {
    try {
      GraftConfig.host = applyGraftConfigHost(httpBackendMode)
      GraftConfig.stateless = true
      setGraftError(null)
    } catch (err) {
      setGraftError(err?.message || 'Failed to initialize GraftConfig')
    }
  }, [httpBackendMode])

  const getEnergyPrice = async () => {
    try {
      const calculatedPrice = await EnergyPriceService.getPrice()
      setPrice(calculatedPrice)
    } catch (err) {
      setGraftError(err?.message || 'getPrice failed')
    }
  }

  const round1 = (ms) => Math.round(ms * 10) / 10

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

  const adjustForLatency = (time, baselineMs) => {
    if (!excludeNetworkLatency || time === null || baselineMs === null) return time
    return round1(Math.max(0, time - baselineMs))
  }

  // One baseline RTT subtracted from the whole run (not × call count): connections
  // are reused, so per-call average is already lower than an isolated probe call.
  const adjustSequentialRunTotal = (totalMs, baselineMs) => {
    if (totalMs === null) return null
    if (!excludeNetworkLatency || baselineMs === null) return round1(totalMs)
    return round1(Math.max(0, totalMs - baselineMs))
  }

  const perRequestMsFromSequentialRun = (totalMs, baselineMs, count) => {
    const adjTotal = adjustSequentialRunTotal(totalMs, baselineMs)
    if (adjTotal === null || !count) return null
    return round1(adjTotal / count)
  }

  const msForTech = (tech) => {
    const count = benchmarkCountUsed
    if (
      !count ||
      restManyTotalMs === null ||
      grpcManyTotalMs === null ||
      grpcStreamManyTotalMs === null ||
      graftManyTotalMs === null
    ) {
      return null
    }
    if (tech === 'REST') return perRequestMsFromSequentialRun(restManyTotalMs, restManyBaselineMs, count)
    if (tech === 'gRPC') return perRequestMsFromSequentialRun(grpcManyTotalMs, grpcManyBaselineMs, count)
    if (tech === 'Graftcode') return perRequestMsFromSequentialRun(graftManyTotalMs, graftManyBaselineMs, count)
    return null
  }

  const patchBenchmarkPath = (key, patch) => {
    setBenchmarkPaths((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const runSequentialCalls = async (count, callFn, onProgress) => {
    await callFn()
    const t0 = performance.now()
    const step = count <= 100 ? 1 : count <= 500 ? 5 : 25
    for (let i = 0; i < count; i++) {
      await callFn()
      if (onProgress && (i === count - 1 || (i + 1) % step === 0)) {
        onProgress(i + 1)
      }
    }
    return round1(performance.now() - t0)
  }

  const runManyCallBenchmark = async () => {
    setIsRunningBenchmark(true)
    setBenchmarkError(null)
    setBenchmarkCountUsed(null)
    setRestManyTotalMs(null)
    setGrpcManyTotalMs(null)
    setGrpcStreamManyTotalMs(null)
    setGraftManyTotalMs(null)
    setRestManyBaselineMs(null)
    setGrpcManyBaselineMs(null)
    setGrpcStreamManyBaselineMs(null)
    setGraftManyBaselineMs(null)
    const count = benchmarkCount
    setBenchmarkPaths(
      Object.fromEntries(
        BENCHMARK_PATH_ORDER.map((key) => [key, { phase: 'pending', current: 0, total: count }])
      )
    )
    try {
      const restHost = restBaseUrl
      const grpcBase = grpcBaseUrl

      const restCall = async () => {
        const r = await fetch(`${restHost}/api/EnergyPrice/price`)
        if (!r.ok) throw new Error(`REST failed (${r.status})`)
        await r.json()
      }
      patchBenchmarkPath('rest', { phase: 'baseline' })
      setRestManyBaselineMs(await measureBaseline(restCall))
      patchBenchmarkPath('rest', { phase: 'running', current: 0 })
      setRestManyTotalMs(
        await runSequentialCalls(count, restCall, (n) => patchBenchmarkPath('rest', { current: n }))
      )
      patchBenchmarkPath('rest', { phase: 'done', current: count })

      const grpcCall = async () => {
        await callGrpcGetPrice(grpcBase)
      }
      patchBenchmarkPath('grpcUnary', { phase: 'baseline' })
      setGrpcManyBaselineMs(await measureBaseline(grpcCall))
      patchBenchmarkPath('grpcUnary', { phase: 'running', current: 0 })
      setGrpcManyTotalMs(
        await runSequentialCalls(count, grpcCall, (n) => patchBenchmarkPath('grpcUnary', { current: n }))
      )
      patchBenchmarkPath('grpcUnary', { phase: 'done', current: count })

      const grpcStreamCall = async () => {
        await streamGrpcPrices(grpcBase, 1)
      }
      patchBenchmarkPath('grpcStream', { phase: 'baseline' })
      setGrpcStreamManyBaselineMs(await measureBaseline(grpcStreamCall))
      patchBenchmarkPath('grpcStream', { phase: 'running', current: 0 })
      setGrpcStreamManyTotalMs(
        await runSequentialCalls(count, grpcStreamCall, (n) => patchBenchmarkPath('grpcStream', { current: n }))
      )
      patchBenchmarkPath('grpcStream', { phase: 'done', current: count })

      const graftCall = async () => {
        await EnergyPriceService.getPrice()
      }
      patchBenchmarkPath('graftcode', { phase: 'baseline' })
      setGraftManyBaselineMs(await measureBaseline(graftCall))
      patchBenchmarkPath('graftcode', { phase: 'running', current: 0 })
      setGraftManyTotalMs(
        await runSequentialCalls(count, graftCall, (n) => patchBenchmarkPath('graftcode', { current: n }))
      )
      patchBenchmarkPath('graftcode', { phase: 'done', current: count })
      setBenchmarkCountUsed(count)
    } catch (err) {
      setBenchmarkError(err?.message || 'Benchmark failed — are the backends running?')
      setBenchmarkPaths((prev) => {
        const next = { ...prev }
        for (const key of BENCHMARK_PATH_ORDER) {
          const p = next[key]
          if (p.phase === 'baseline' || p.phase === 'running') {
            next[key] = { ...p, phase: 'error' }
            break
          }
        }
        return next
      })
    } finally {
      setIsRunningBenchmark(false)
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

  const formatManyCallStats = (totalMs, baselineMs, count) => {
    if (totalMs === null || !count) {
      return <span className="muted">—</span>
    }
    const perReq = round1(totalMs / count)
    const adjTotal = adjustSequentialRunTotal(totalMs, baselineMs)
    const adjPerReq = perRequestMsFromSequentialRun(totalMs, baselineMs, count)
    return (
      <span className="benchmark-path-stats">
        <span className="benchmark-path-stats-main">
          <strong>{adjTotal} ms</strong> total · <strong>{adjPerReq} ms</strong>/call
        </span>
        {excludeNetworkLatency && baselineMs !== null && (
          <span className="latency-breakdown benchmark-path-stats-detail">
            raw {totalMs} ms · {perReq} ms/call; −{baselineMs} ms setup
          </span>
        )}
      </span>
    )
  }

  const benchmarkPathResults = {
    rest: { totalMs: restManyTotalMs, baselineMs: restManyBaselineMs },
    grpcUnary: { totalMs: grpcManyTotalMs, baselineMs: grpcManyBaselineMs },
    grpcStream: { totalMs: grpcStreamManyTotalMs, baselineMs: grpcStreamManyBaselineMs },
    graftcode: { totalMs: graftManyTotalMs, baselineMs: graftManyBaselineMs },
  }

  const benchmarkPathBarPercent = (path) => {
    const { phase, current, total } = path
    if (phase === 'done') return 100
    if (phase === 'baseline') return 8
    if (phase === 'running' && total > 0) return Math.min(100, Math.round((current / total) * 100))
    if (phase === 'error') return 100
    return 0
  }

  const hasManyCallResults =
    benchmarkCountUsed !== null &&
    restManyTotalMs !== null &&
    grpcManyTotalMs !== null &&
    grpcStreamManyTotalMs !== null &&
    graftManyTotalMs !== null

  return (
    <div className="perf-app">
      {graftError && (
        <div className="graft-error" role="alert">
          GraftConfig init failed: {graftError}. Running locally, the backend may be unreachable.
        </div>
      )}

      <header className="hero">
        <h1>Graftcode vs REST and gRPC Performance Lab</h1>
        <p>Measure integration performance: Graftcode (no integration layer) versus REST/JSON and gRPC/protobuf — both backed by the same .NET runtime on HTTP/2.</p>
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

      <section className="payload-comparison many-call-benchmark" aria-labelledby="many-call-heading">
        <header className="benchmark-intro">
          <h2 id="many-call-heading">Sequential call benchmark</h2>
          <p>
            Many sequential <code>getPrice</code> calls per integration path (REST → gRPC unary → gRPC stream
            → Graftcode). Streaming uses one <code>PricePoint</code> per call so it stays comparable to unary.
          </p>
        </header>

        <div className="benchmark-toolbar">
          {httpBackendSwitchVisible ? (
            <Select
              id="http-backend-mode-benchmark"
              label="HTTP version:"
              value={httpBackendMode}
              options={HTTP_BACKEND_MODE_OPTIONS}
              onValueChange={onHttpBackendModeChange}
            />
          ) : null}
          <Select
            id="benchmark-count-select"
            label="Calls per path:"
            value={String(benchmarkCount)}
            options={benchmarkCountOptions}
            onValueChange={(value) => setBenchmarkCount(Number(value))}
          />
          <Button
            variant="primary"
            onClick={runManyCallBenchmark}
            disabled={isRunningBenchmark}
          >
            {isRunningBenchmark ? 'Running…' : 'Run benchmark'}
          </Button>
          <div className="benchmark-toolbar-options">
            <Checkbox
              id="exclude-network-latency"
              checked={excludeNetworkLatency}
              onChange={(next) => setExcludeNetworkLatency(next === true)}
              label="Exclude Network Latency"
            />
            <Button
              variant="outlined"
              className="info-link"
              onClick={() => setShowLatencyExplanation(!showLatencyExplanation)}
            >
              Why it matters?
            </Button>
          </div>
        </div>

        {benchmarkError && (
          <div className="payload-error" role="alert">{benchmarkError}</div>
        )}

        <ul className="benchmark-path-list benchmark-summary" aria-live="polite">
          {BENCHMARK_PATH_ORDER.map((key) => {
            const path = benchmarkPaths[key]
            const { label } = BENCHMARK_PATH_META[key]
            const { totalMs, baselineMs } = benchmarkPathResults[key]
            const count = benchmarkCountUsed ?? path.total
            const pct = benchmarkPathBarPercent(path)
            const status =
              path.phase === 'running'
                ? `${BENCHMARK_PHASE_LABEL.running} ${path.current}/${path.total}`
                : BENCHMARK_PHASE_LABEL[path.phase] ?? path.phase
            return (
              <li
                key={key}
                className={`benchmark-path-card benchmark-path-card--${path.phase}`}
              >
                <span className="benchmark-path-name">{label}</span>
                <div
                  className="benchmark-path-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${label} progress`}
                >
                  <div
                    className="benchmark-path-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="benchmark-path-status">{status}</span>
                <div className="benchmark-path-result">
                  {formatManyCallStats(totalMs, baselineMs, count)}
                </div>
              </li>
            )
          })}
        </ul>

        {hasManyCallResults && (
          <GraftcodeSpeedSummary
            results={[
              { name: 'REST', ms: perRequestMsFromSequentialRun(restManyTotalMs, restManyBaselineMs, benchmarkCountUsed) },
              { name: 'gRPC unary', ms: perRequestMsFromSequentialRun(grpcManyTotalMs, grpcManyBaselineMs, benchmarkCountUsed) },
              { name: 'gRPC stream', ms: perRequestMsFromSequentialRun(grpcStreamManyTotalMs, grpcStreamManyBaselineMs, benchmarkCountUsed) },
              { name: 'Graftcode', ms: perRequestMsFromSequentialRun(graftManyTotalMs, graftManyBaselineMs, benchmarkCountUsed) },
            ]}
            contextNote={`${benchmarkCountUsed.toLocaleString()} sequential getPrice calls per path${excludeNetworkLatency ? ' (network setup excluded)' : ''}.`}
          />
        )}
      </section>

      {showLatencyExplanation && (
        <div className="explanation-popup-overlay">
          <div className="explanation-popup">
            <p>
              <strong>Why Excluding Network Latency Matters:</strong>
            </p>
            <p>
              REST, gRPC, and Graftcode requests often share similar network round-trips. To highlight
              encoding and protocol differences, we measure a single small <code>getPrice</code> call per
              path.               For the sequential benchmark we subtract that setup time once from each path’s total run.
            </p>
            <p>
              The first call on each path is always discarded during baseline measurement because it also
              pays connection setup (TLS, WebSocket, HTTP/2). Turn this off to see end-to-end times including
              network latency.
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
        <p>
          Estimate annual compute savings from switching technologies. Uses per-call times from the
          sequential <code>getPrice</code> benchmark.
        </p>

        <div className="cost-controls">
          <div className="control-group">
            <Select
              id="rps-select"
              label="getPrice requests per second (RPS):"
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
            return (
              <div className="cost-results">
                <p className="muted">Run the sequential benchmark to see cost savings.</p>
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
