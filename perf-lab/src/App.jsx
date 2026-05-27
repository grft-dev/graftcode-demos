import { useState, useEffect } from 'react'
import './App.css'
import { GraftConfig, EnergyPriceService } from '@graft/nuget-EnergyPriceService'
import { Button, Checkbox, ProgressIndicator, Select } from '@graftcode/design-system'
import { callGrpcGetPrice, callGrpcGetPriceHistory, streamGrpcPrices } from './grpcClient'



function App() {
  const NUM_CALLS = 1000
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
  ]
  const [currency, setCurrency] = useState('EUR')
  const [graftError, setGraftError] = useState(null)

  useEffect(() => {
    try {
      GraftConfig.host = import.meta.env.VITE_GRAFT_WS_URL ?? 'ws://localhost:5001/ws'
    } catch (err) {
      setGraftError(err?.message || 'Failed to initialize GraftConfig')
    }
  }, [])
  const [price, setPrice] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(null)
  const [isTestingRest, setIsTestingRest] = useState(false)
  const [elapsedRestMs, setElapsedRestMs] = useState(null)
  const [progressGraft, setProgressGraft] = useState(0)
  const [progressRest, setProgressRest] = useState(0)
  const [isTestingGrpc, setIsTestingGrpc] = useState(false)
  const [elapsedGrpcMs, setElapsedGrpcMs] = useState(null)
  const [progressGrpc, setProgressGrpc] = useState(0)
  const [excludeNetworkLatency, setExcludeNetworkLatency] = useState(true)
  const [showLatencyExplanation, setShowLatencyExplanation] = useState(false)
  const [rps, setRps] = useState(200000)
  const [cloudProvider, setCloudProvider] = useState('Azure')
  const [integrationTech, setIntegrationTech] = useState('REST')

  // Large-payload / streaming comparison state
  const payloadCountOptions = [
    { type: 'item', value: '1000', label: '1,000 points' },
    { type: 'item', value: '5000', label: '5,000 points' },
    { type: 'item', value: '20000', label: '20,000 points' },
    { type: 'item', value: '50000', label: '50,000 points' },
  ]
  const [payloadCount, setPayloadCount] = useState(5000)
  const [isRunningPayload, setIsRunningPayload] = useState(false)
  const [restHistoryMs, setRestHistoryMs] = useState(null)
  const [restHistoryKb, setRestHistoryKb] = useState(null)
  const [grpcHistoryMs, setGrpcHistoryMs] = useState(null)
  const [grpcStreamMs, setGrpcStreamMs] = useState(null)

  const runPayloadComparison = async () => {
    setIsRunningPayload(true)
    setRestHistoryMs(null)
    setRestHistoryKb(null)
    setGrpcHistoryMs(null)
    setGrpcStreamMs(null)
    try {
      const restHost = import.meta.env.VITE_REST_URL ?? 'https://localhost:8090'
      const grpcBase = import.meta.env.VITE_GRPC_URL ?? 'https://localhost:5005'

      // REST: one GET returning a big JSON array. Read AND parse into objects so
      // it's apples-to-apples with gRPC (which decodes protobuf into objects).
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

  const getEstimatedNetworkLatency = () => {
    const times = [elapsedMs, elapsedRestMs, elapsedGrpcMs].filter(time => time !== null)
    if (times.length === 0) return 0
    const lowestTime = Math.min(...times)
    return Math.round(lowestTime * 0.8)
  }

  // Cloud instance pricing (per hour in USD) - High Performance Production Instances
  const cloudPricing = {
    Azure: {
      'Standard_D8s_v5': 0.384,  // 8 vCPUs, 32 GB RAM, Premium SSD
      'Standard_D16s_v5': 0.768, // 16 vCPUs, 64 GB RAM, Premium SSD
      'Standard_D32s_v5': 1.536  // 32 vCPUs, 128 GB RAM, Premium SSD
    },
    AWS: {
      'c6i.2xlarge': 0.3408,  // 8 vCPUs, 16 GB RAM, High Performance
      'c6i.4xlarge': 0.6816,  // 16 vCPUs, 32 GB RAM, High Performance
      'c6i.8xlarge': 1.3632   // 32 vCPUs, 64 GB RAM, High Performance
    },
    'Google Cloud Platform': {
      'c2-standard-8': 0.2688,  // 8 vCPUs, 32 GB RAM, Compute Optimized
      'c2-standard-16': 0.5376, // 16 vCPUs, 64 GB RAM, Compute Optimized
      'c2-standard-32': 1.0752  // 32 vCPUs, 128 GB RAM, Compute Optimized
    }
  }

  const calculateCostSavings = () => {
    if (elapsedMs === null) return null
    
    const selectedTechTime = integrationTech === 'REST' ? elapsedRestMs : elapsedGrpcMs
    if (selectedTechTime === null) return null

    const estimatedLatency = getEstimatedNetworkLatency()
    const adjustForLatency = (time) => {
      if (!excludeNetworkLatency || time === null) return time
      return Math.max(0, time - estimatedLatency)
    }

    const graftcodeTime = adjustForLatency(elapsedMs)
    const otherTechTime = adjustForLatency(selectedTechTime)
    
    if (graftcodeTime >= otherTechTime) return null // No savings if Graftcode is not faster

    // Calculate time saved per call (in seconds)
    // The performance difference is for 1000 calls, so divide by 1000 to get per-call difference
    const timeSavedPerCall = (otherTechTime - graftcodeTime) / 1000 / 1000
    
    // Calculate total calls per year (RPS * seconds in a year)
    const secondsInYear = 365 * 24 * 3600 // 31,536,000 seconds
    const totalCallsPerYear = rps * secondsInYear
    
    // Calculate total time saved annually (in hours)
    const totalTimeSavedHours = (timeSavedPerCall * totalCallsPerYear) / 3600
    
    // Get instance pricing - default to mid-tier high performance instance
    const defaultInstances = {
      'Azure': 'Standard_D16s_v5',
      'AWS': 'c6i.4xlarge', 
      'Google Cloud Platform': 'c2-standard-16'
    }
    const instanceType = defaultInstances[cloudProvider] || 'Standard_D16s_v5'
    const hourlyCost = cloudPricing[cloudProvider]?.[instanceType] || 0.768
    
    // Calculate cost savings
    const annualCostSavings = totalTimeSavedHours * hourlyCost

    return {
      timeSavedPerCall,
      totalTimeSavedHours,
      annualCostSavings,
      instanceType
    }
  }

  const getEnergyPrice = async() => {
    const calculatedPrice = await EnergyPriceService.GetPrice()
    setPrice(calculatedPrice)
  }

  const testGraftcodePerformance = async () => {
    try {
      setIsTesting(true)
      setElapsedMs(null)
      setProgressGraft(0)
      const startTime = performance.now()
      for (let iterationIndex = 0; iterationIndex < NUM_CALLS; iterationIndex += 1) {
        await EnergyPriceService.GetPrice()
        if ((iterationIndex + 1) % 10 === 0 || iterationIndex + 1 === NUM_CALLS) {
          setProgressGraft(Math.round(((iterationIndex + 1) / NUM_CALLS) * 100))
        }
      }
      const endTime = performance.now()
      setElapsedMs(Math.round(endTime - startTime))
    } finally {
      setIsTesting(false)
    }
  }

  const testRestPerformance = async () => {
    try {
      setIsTestingRest(true)
      setElapsedRestMs(null)
      setProgressRest(0)
      const restHost = import.meta.env.VITE_REST_URL ?? 'http://localhost:8090'
      const url = `${restHost}/api/EnergyPrice/price`
      const startTime = performance.now()
      for (let iterationIndex = 0; iterationIndex < NUM_CALLS; iterationIndex += 1) {
        const response = await fetch(url, { method: 'GET' })
        // Ensure the request fully completes; read body minimally
        // If the endpoint returns JSON, parsing ensures completion
        try { await response.json() } catch { /* ignore non-JSON */ }
        if ((iterationIndex + 1) % 10 === 0 || iterationIndex + 1 === NUM_CALLS) {
          setProgressRest(Math.round(((iterationIndex + 1) / NUM_CALLS) * 100))
        }
      }
      const endTime = performance.now()
      setElapsedRestMs(Math.round(endTime - startTime))
    } finally {
      setIsTestingRest(false)
    }
  }


  const testGrpcPerformance = async () => {
    try {
      setIsTestingGrpc(true)
      setElapsedGrpcMs(null)
      setProgressGrpc(0)
      const startTime = performance.now()
      const grpcBase = import.meta.env.VITE_GRPC_URL ?? 'https://localhost:5005'
      for (let iterationIndex = 0; iterationIndex < NUM_CALLS; iterationIndex += 1) {
        await callGrpcGetPrice(grpcBase)
        if ((iterationIndex + 1) % 10 === 0 || iterationIndex + 1 === NUM_CALLS) {
          setProgressGrpc(Math.round(((iterationIndex + 1) / NUM_CALLS) * 100))
        }
      }
      const endTime = performance.now()
      setElapsedGrpcMs(Math.round(endTime - startTime))
    } finally {
      setIsTestingGrpc(false)
    }
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
        <p>Measure integration performance: Graftcode (no integration layer) versus a standard REST web service and gRPC.</p>
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

      <section className="grid">
        <div className="card">
          <h2>Network Latency</h2>
          <p>Estimated network latency based on the fastest result (80% of lowest time).</p>
          <div className="metrics">
            <span className="metric">Estimated Network Latency: {getEstimatedNetworkLatency()} ms</span>
          </div>
          <div className="controls">
            <Checkbox
              id="exclude-network-latency"
              checked={excludeNetworkLatency}
              onChange={(next) => setExcludeNetworkLatency(next === true)}
              label="Exclude Network Latency"
            />
          </div>
          <div className="info-section">
            <Button
              variant="outlined"
              className="info-link"
              onClick={() => setShowLatencyExplanation(!showLatencyExplanation)}
            >
              Why it matters?
            </Button>
          </div>
        </div>

        <div className="card tech-card">
          <h2>Graftcode</h2>
          <p className="tech-description">Run {NUM_CALLS} direct calls via Graftcode runtime (total time).</p>
          <Button variant="primary" onClick={testGraftcodePerformance} disabled={isTesting}>
            {isTesting ? `Running ${NUM_CALLS} calls…` : `Run ${NUM_CALLS} calls`}
          </Button>
          <div className="progress" aria-label="Graftcode Progress">
            <ProgressIndicator
              className="progress-indicator graft"
              value={progressGraft}
              size="small"
              aria-label="Graftcode Progress"
            />
          </div>
          <div className="metrics">
            {elapsedMs !== null ? (
              <span className="metric">Total: {elapsedMs} ms</span>
            ) : (
              <span className="metric muted">No result yet</span>
            )}
          </div>
        </div>

        <div className="card tech-card">
          <h2>REST</h2>
          <p className="tech-description">Run {NUM_CALLS} HTTP GETs to /price endpoint (total time).</p>
          <Button variant="primary" onClick={testRestPerformance} disabled={isTestingRest}>
            {isTestingRest ? `Running ${NUM_CALLS} calls…` : `Run ${NUM_CALLS} calls`}
          </Button>
          <div className="progress" aria-label="REST Progress">
            <ProgressIndicator
              className="progress-indicator rest"
              value={progressRest}
              size="small"
              aria-label="REST Progress"
            />
          </div>
          <div className="metrics">
            {elapsedRestMs !== null ? (
              <span className="metric">Total: {elapsedRestMs} ms</span>
            ) : (
              <span className="metric muted">No result yet</span>
            )}
          </div>
        </div>

        <div className="card tech-card">
          <h2>gRPC</h2>
          <p className="tech-description">Run {NUM_CALLS} gRPC calls to GetPrice (total time).</p>
          <Button variant="primary" onClick={testGrpcPerformance} disabled={isTestingGrpc}>
            {isTestingGrpc ? `Running ${NUM_CALLS} calls…` : `Run ${NUM_CALLS} calls`}
          </Button>
          <div className="progress" aria-label="gRPC Progress">
            <ProgressIndicator
              className="progress-indicator grpc"
              value={progressGrpc}
              size="small"
              aria-label="gRPC Progress"
            />
          </div>
          <div className="metrics">
            {elapsedGrpcMs !== null ? (
              <span className="metric">Total: {elapsedGrpcMs} ms</span>
            ) : (
              <span className="metric muted">No result yet</span>
            )}
          </div>
        </div>
      </section>

      {showLatencyExplanation && (
        <div className="explanation-popup-overlay">
          <div className="explanation-popup">
            <p>
              <strong>Why Excluding Network Latency Matters for Performance Comparison:</strong>
            </p>
            <p>
              Graftcode optimizes client and server side processing performance by eliminating unnecessary integration layers and establishing direct connections to native layer of runtime hosting target modules. This architectural advantage becomes more apparent when network latency is factored out of the comparison.
            </p>
            <p>
              The greater the network latency between browser and backend, the less visible the actual processing performance gains become. By subtracting the estimated network overhead, we can better assess the true performance benefits of Graftcode's streamlined architecture.
            </p>
            <p>
              Our 80% network latency estimate is based on controlled testing where all services and clients run as Docker containers on a single machine, effectively eliminating network factors. This browser-based comparison has been calibrated to provide accurate performance assessments by accounting for network overhead.
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

      <section className="comparison">
        <h3>Performance Comparison (total time for {NUM_CALLS} calls{excludeNetworkLatency && getEstimatedNetworkLatency() > 0 ? ' - network latency excluded' : ''})</h3>
        {(elapsedMs !== null || elapsedRestMs !== null || elapsedGrpcMs !== null) ? (
          <>
            {(() => {
              const estimatedLatency = getEstimatedNetworkLatency()
              
              const adjustForLatency = (time) => {
                if (!excludeNetworkLatency || time === null) return time
                return Math.max(0, time - estimatedLatency)
              }

              const formatResult = (label, value) => {
                if (value === null) return `${label}: —`
                const adjustedValue = adjustForLatency(value)
                if (excludeNetworkLatency && estimatedLatency > 0) {
                  return (
                    <div>
                      <div>{label}: {adjustedValue} ms</div>
                      <div className="latency-breakdown">({value} ms - {estimatedLatency} ms network)</div>
                    </div>
                  )
                }
                return `${label}: ${value} ms`
              }

              const getSpeedImprovement = (graftcodeTime, otherTime, otherName) => {
                const adjustedGraftcode = adjustForLatency(graftcodeTime)
                const adjustedOther = adjustForLatency(otherTime)
                
                if (adjustedGraftcode === null || adjustedOther === null || adjustedGraftcode === 0 || adjustedOther === 0) return 'Results ready'
                if (adjustedOther > adjustedGraftcode) {
                  const improvement = (((adjustedOther - adjustedGraftcode) / adjustedOther) * 100).toFixed(1)
                  return `Graftcode is ${improvement}% faster than ${otherName}`
                } else {
                  const improvement = (((adjustedGraftcode - adjustedOther) / adjustedGraftcode) * 100).toFixed(1)
                  return `${otherName} is ${improvement}% faster than Graftcode`
                }
              }

              return (
                <>
                  <div className="summary">
                    <div>{formatResult('Graftcode', elapsedMs)}</div>
                    <div>{formatResult('REST', elapsedRestMs)}</div>
                    <div>{formatResult('gRPC', elapsedGrpcMs)}</div>
                  </div>
                  {(elapsedMs !== null && elapsedRestMs !== null) && (
                    <div className="callout">
                      <strong>{getSpeedImprovement(elapsedMs, elapsedRestMs, 'REST')}</strong>
                    </div>
                  )}
                  {(elapsedMs !== null && elapsedGrpcMs !== null) && (
                    <div className="callout">
                      <strong>{getSpeedImprovement(elapsedMs, elapsedGrpcMs, 'gRPC')}</strong>
                    </div>
                  )}
                </>
              )
            })()}
          </>
        ) : (
          <p className="muted">Run tests to compare results.</p>
        )}
      </section>

      <section className="payload-comparison">
        <h3>Large Payload &amp; Streaming (REST vs gRPC, same .NET runtime)</h3>
        <p>
          One call returning many price points. gRPC sends a <strong>~49% smaller</strong> binary
          protobuf payload than REST/JSON for the same data — but on <strong>localhost</strong> that
          size win saves ~no time (loopback bandwidth is unlimited), and decoding is CPU-bound where
          the browser&apos;s native <code>JSON.parse</code> beats JS protobuf decoding. So here REST
          usually wins. gRPC&apos;s payload advantage shows on a real, bandwidth/latency-limited
          network (e.g. a deployed environment), where moving half the bytes is a real time saving.
        </p>
        <div className="cost-controls">
          <div className="control-group">
            <Select
              id="payload-count-select"
              label="Points per call:"
              value={String(payloadCount)}
              options={payloadCountOptions}
              onValueChange={(value) => setPayloadCount(Number(value))}
            />
          </div>
          <Button variant="primary" onClick={runPayloadComparison} disabled={isRunningPayload}>
            {isRunningPayload ? 'Running…' : 'Run comparison'}
          </Button>
        </div>

        <div className="summary">
          <div>
            REST (JSON): {restHistoryMs !== null ? `${restHistoryMs} ms` : '—'}
            {restHistoryKb !== null ? ` (${restHistoryKb} KB)` : ''}
          </div>
          <div>gRPC unary (protobuf): {grpcHistoryMs !== null ? `${grpcHistoryMs} ms` : '—'}</div>
          <div>gRPC server-streaming: {grpcStreamMs !== null ? `${grpcStreamMs} ms` : '—'}</div>
        </div>

        {(restHistoryMs !== null && grpcHistoryMs !== null) && (
          <div className="callout">
            <strong>
              {grpcHistoryMs < restHistoryMs
                ? `gRPC unary is ${(((restHistoryMs - grpcHistoryMs) / restHistoryMs) * 100).toFixed(1)}% faster than REST`
                : `REST is ${(((grpcHistoryMs - restHistoryMs) / grpcHistoryMs) * 100).toFixed(1)}% faster than gRPC unary`}
            </strong>
          </div>
        )}
      </section>

      <section className="cost-savings">
        <h3>Cloud Cost Savings</h3>
        <p>Calculate potential cost savings by switching to Graftcode based on your system's call volume and cloud infrastructure.</p>
        
        <div className="cost-controls">
          <div className="control-group">
            <Select
              id="rps-select"
              label="Edge/API/Service-To-Service Calls RPS:"
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
                <p className="muted">Run performance tests to see cost savings calculations.</p>
              </div>
            )
          }

          return (
            <div className="cost-results">
              <h4>Annual Cost Savings</h4>
              <div className="savings-breakdown">
                <div className="savings-item">
                  <span className="label">Time saved per call:</span>
                  <span className="value">{(savings.timeSavedPerCall * 1000).toFixed(2)} ms</span>
                </div>
                <div className="savings-item">
                  <span className="label">Total calls per year:</span>
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
                <p><em>Based on {rps.toLocaleString()} RPS, {cloudProvider} {savings.instanceType} pricing, and {integrationTech} vs Graftcode performance difference.</em></p>
              </div>
            </div>
          )
        })()}
      </section>
    </div>
  )
}

export default App