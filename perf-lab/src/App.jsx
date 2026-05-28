import { useState, useEffect } from 'react'
import './App.css'
import { GraftConfig, EnergyPriceService } from '@graft/nuget-EnergyPriceService'
import { Button, Checkbox, Select } from '@graftcode/design-system'
import { callGrpcGetPriceHistory, streamGrpcPrices } from './grpcClient'

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
  const payloadCountOptions = [
    { type: 'item', value: '1000', label: '1,000 points' },
    { type: 'item', value: '5000', label: '5,000 points' },
    { type: 'item', value: '20000', label: '20,000 points' },
    { type: 'item', value: '50000', label: '50,000 points' },
  ]

  const [currency, setCurrency] = useState('EUR')
  const [graftError, setGraftError] = useState(null)
  const [price, setPrice] = useState(0)

  const [excludeNetworkLatency, setExcludeNetworkLatency] = useState(true)
  const [showLatencyExplanation, setShowLatencyExplanation] = useState(false)

  const [payloadCount, setPayloadCount] = useState(5000)
  const [isRunningPayload, setIsRunningPayload] = useState(false)
  const [restHistoryMs, setRestHistoryMs] = useState(null)
  const [restHistoryKb, setRestHistoryKb] = useState(null)
  const [grpcHistoryMs, setGrpcHistoryMs] = useState(null)
  const [grpcStreamMs, setGrpcStreamMs] = useState(null)

  const [rps, setRps] = useState(200000)
  const [cloudProvider, setCloudProvider] = useState('Azure')

  useEffect(() => {
    try {
      GraftConfig.host = import.meta.env.VITE_GRAFT_WS_URL ?? 'ws://localhost:5001/ws'
    } catch (err) {
      setGraftError(err?.message || 'Failed to initialize GraftConfig')
    }
  }, [])

  const getEnergyPrice = async () => {
    const calculatedPrice = await EnergyPriceService.GetPrice()
    setPrice(calculatedPrice)
  }

  const getEstimatedNetworkLatency = () => {
    const times = [restHistoryMs, grpcHistoryMs].filter(t => t !== null)
    if (times.length === 0) return 0
    return Math.round(Math.min(...times) * 0.8)
  }

  const adjustForLatency = (time) => {
    if (!excludeNetworkLatency || time === null) return time
    return Math.max(0, time - getEstimatedNetworkLatency())
  }

  const runPayloadComparison = async () => {
    setIsRunningPayload(true)
    setRestHistoryMs(null)
    setRestHistoryKb(null)
    setGrpcHistoryMs(null)
    setGrpcStreamMs(null)
    try {
      const restHost = import.meta.env.VITE_REST_URL ?? 'https://localhost:8090'
      const grpcBase = import.meta.env.VITE_GRPC_URL ?? 'https://localhost:5005'

      // REST: one GET returning a big JSON array. Parse into objects so it's
      // apples-to-apples with gRPC (which decodes protobuf into objects).
      let t = performance.now()
      const resp = await fetch(`${restHost}/api/EnergyPrice/history?count=${payloadCount}`)
      const text = await resp.text()
      const restPoints = JSON.parse(text)
      void restPoints.length
      setRestHistoryMs(Math.round(performance.now() - t))
      setRestHistoryKb(Math.round(text.length / 1024))

      // gRPC unary: one call returning a repeated protobuf message (decoded to objects).
      t = performance.now()
      await callGrpcGetPriceHistory(grpcBase, payloadCount)
      setGrpcHistoryMs(Math.round(performance.now() - t))

      // gRPC server streaming: points arrive one at a time over one HTTP/2 stream.
      t = performance.now()
      await streamGrpcPrices(grpcBase, payloadCount)
      setGrpcStreamMs(Math.round(performance.now() - t))
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
    if (restHistoryMs === null || grpcHistoryMs === null) return null

    const adjRest = adjustForLatency(restHistoryMs)
    const adjGrpc = adjustForLatency(grpcHistoryMs)
    if (adjGrpc >= adjRest) return null

    const timeSavedPerRequestS = (adjRest - adjGrpc) / 1000
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

    return { timeSavedPerRequestMs: adjRest - adjGrpc, totalTimeSavedHours, annualCostSavings, instanceType }
  }

  const estimatedLatency = getEstimatedNetworkLatency()

  const formatPayloadResult = (label, ms, kb) => {
    if (ms === null) return <span>{label}: <span className="muted">—</span></span>
    const adj = adjustForLatency(ms)
    return (
      <span>
        {label}: <strong>{adj} ms</strong>
        {kb != null ? ` (${kb} KB)` : ''}
        {excludeNetworkLatency && estimatedLatency > 0 && (
          <span className="latency-breakdown"> ({ms} ms − {estimatedLatency} ms network)</span>
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
        <h1>REST vs gRPC Performance Lab</h1>
        <p>Compare large-payload performance: REST/JSON versus gRPC/protobuf — both backed by the same .NET runtime on HTTP/2.</p>
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
            <p>One request returning many price points. REST uses JSON, gRPC uses protobuf — same .NET backend, same data.</p>
          </div>
          <div className="latency-controls">
            <div className="latency-row">
              <Checkbox
                id="exclude-network-latency"
                checked={excludeNetworkLatency}
                onChange={(next) => setExcludeNetworkLatency(next === true)}
                label="Exclude Network Latency"
              />
              {estimatedLatency > 0 && (
                <span className="latency-estimate">~{estimatedLatency} ms estimated</span>
              )}
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

        <div className="summary">
          <div>{formatPayloadResult('REST (JSON)', restHistoryMs, restHistoryKb)}</div>
          <div>{formatPayloadResult('gRPC unary (protobuf)', grpcHistoryMs, null)}</div>
          <div>{formatPayloadResult('gRPC server-streaming', grpcStreamMs, null)}</div>
        </div>

        {(restHistoryMs !== null && grpcHistoryMs !== null) && (() => {
          const adjRest = adjustForLatency(restHistoryMs)
          const adjGrpc = adjustForLatency(grpcHistoryMs)
          return (
            <div className="callout">
              <strong>
                {adjGrpc < adjRest
                  ? `gRPC unary is ${(((adjRest - adjGrpc) / adjRest) * 100).toFixed(1)}% faster than REST`
                  : `REST is ${(((adjGrpc - adjRest) / adjGrpc) * 100).toFixed(1)}% faster than gRPC unary`}
              </strong>
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
              Both REST and gRPC requests travel the same network path, so each carries the same round-trip overhead. To isolate the actual encoding/transfer difference between JSON and protobuf, we subtract the estimated shared network overhead from both results.
            </p>
            <p>
              The estimate is 80% of the fastest observed result — a conservative proxy for the per-request RTT contribution. The higher the network latency, the more it masks the real format/protocol difference.
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
        <p>Estimate the annual compute savings from switching to gRPC based on the payload test results and your request volume.</p>

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
        </div>

        {(() => {
          const savings = calculateCostSavings()
          if (!savings) {
            return (
              <div className="cost-results">
                <p className="muted">Run the payload comparison above to see cost savings calculations.</p>
              </div>
            )
          }
          return (
            <div className="cost-results">
              <h4>Annual Cost Savings (REST → gRPC)</h4>
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
                <p><em>Based on {rps.toLocaleString()} RPS, {cloudProvider} {savings.instanceType} pricing, and measured REST vs gRPC performance difference{excludeNetworkLatency ? ' (network latency excluded)' : ''}.</em></p>
              </div>
            </div>
          )
        })()}
      </section>
    </div>
  )
}

export default App
