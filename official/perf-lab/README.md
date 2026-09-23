# perf-lab

React/Vite performance benchmark that measures Graftcode, REST, and gRPC side-by-side.

## What it does

### 1 000-call benchmark

Fires 1 000 sequential calls on each of the three paths and reports total elapsed time:

- **Graftcode** — direct in-process call (mocked locally; no network hop)
- **REST** — `fetch` → .NET Kestrel → JSON response over HTTP/2
- **gRPC** — ConnectRPC → .NET Kestrel → protobuf response over HTTP/2

### Large Payload & Streaming

One call returning N price points (configurable: 1 k – 50 k). Compares:

- REST JSON (one response, decoded with `JSON.parse`)
- gRPC unary (one protobuf response, decoded by `@bufbuild/protobuf`)
- gRPC server-streaming (points stream in over one HTTP/2 stream)

Both backends are .NET 8 / Kestrel so the runtime is identical — only wire format and protocol differ.

### Cloud Cost Savings calculator

Extrapolates the measured performance difference to an annual cost saving based on your RPS and cloud provider.

### Static integration metrics (SLOC / tokens)

Latency is measured live. Lines of code and tokens are **not** — they were counted once from the EnergyPrice call path (REST vs gRPC vs Graftcode). See [src/metrics/METRICS.md](src/metrics/METRICS.md).

The **Code & AI Token Cost** table below the cost calculator renders these frozen numbers by importing `src/metrics/loc-comparison.json`, so re-running the measurement updates the page without touching `App.jsx`:

```bash
cd ../../scripts && npm install && npm run measure
```

## Project structure

```
src/
  App.jsx          Main UI and benchmark logic
  grpcClient.js    ConnectRPC client (with HTTP/2 connection caching)
  priceProto.js    Hand-authored protobuf descriptors (no protoc required)
  metrics/         Frozen SLOC/token comparison (not computed at runtime — see METRICS.md)
  stubs/
    graft.js             Mock for @graft/nuget-EnergyPriceService
    design-system.jsx    Mock for @graftcode/design-system components
    design-system.css    Stub styles
vite.config.js     Aliases that map private packages to local stubs
Dockerfile         node:22-alpine build → nginx:alpine serve
nginx.conf         Serves on port 81; proxies /grpc/* on port 5003
```

## Local development

```bash
npm install
npm run dev
```

Requires `.env` with:

```
VITE_REST_URL=https://localhost:8090
VITE_GRPC_URL=https://localhost:5005
VITE_GRAFT_WS_URL=ws://localhost:5000/ws
```

Copy `.env.example` to `.env` and start the two .NET backends before running the frontend. See the root `README.md` for backend setup instructions.

## Build

```bash
npm run build
```

The Dockerfile is built by `deploy-azure.ps1` via ACR remote build; backend URLs are baked in as `VITE_*` build args.

## GitHub Pages

The repository workflow `.github/workflows/deploy-perf-lab-pages.yml` builds and deploys this frontend to GitHub Pages when changes land on `main`.

Before the first run, add these **repository variables** under **Settings → Secrets and variables → Actions → Variables**:

```text
PERF_LAB_REST_URL=https://your-rest-backend.example.com
PERF_LAB_GRPC_URL=https://your-grpc-backend.example.com
PERF_LAB_GRAFT_WS_URL=wss://your-graft-gateway.example.com/ws
```

The backend services must allow requests from the Pages origin with CORS. GitHub Pages cannot proxy WebSocket, REST, or gRPC requests, so these URLs must be publicly reachable over HTTPS/WSS. Enable Pages in **Settings → Pages** with **GitHub Actions** as the source. The deployed site will be available at `https://<owner>.github.io/graftcode-demos/`.
