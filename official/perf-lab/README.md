# perf-lab

React/Vite performance benchmark that measures Graftcode, REST, and gRPC side-by-side.

## What it does

### 1 000-call benchmark

Fires 1 000 sequential calls on each of the three paths and reports total elapsed time:

- **Graftcode** — direct in-process call (mocked locally; no network hop)
- **REST** — `fetch` → .NET Kestrel → JSON response over HTTP/2
- **gRPC** — ConnectRPC → .NET Kestrel → protobuf response over HTTP/2

### Large Payload & Streaming

One call returning N price points (configurable: 1 k – 50 k). **Run comparison** measures:

- REST JSON (one response, decoded with `JSON.parse`)
- gRPC unary (one protobuf response, decoded by `@bufbuild/protobuf`)
- gRPC server-streaming (`streamPrices` — points arrive one at a time over one HTTP/2 stream)
- Graftcode (direct method call over the gateway WebSocket)

The cloud cost calculator uses REST, gRPC **unary**, and Graftcode. Streaming is a protocol variant of the same gRPC channel, not a fourth integration technology.

Both backends are .NET 8 / Kestrel so the runtime is identical — only wire format and protocol differ.

### Cloud Cost Savings calculator

Extrapolates the measured performance difference to an annual cost saving based on your RPS and cloud provider.

## Project structure

```
src/
  App.jsx          Main UI and benchmark logic
  grpcClient.js    ConnectRPC client (with HTTP/2 connection caching)
  priceProto.js    Hand-authored protobuf descriptors (no protoc required)
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

Copy `.env.example` to `.env` and start the two .NET backends plus the Graftcode gateway before running the frontend. See the root `README.md` for backend setup.

```bash
npm test
```

Playwright hits the live REST (`:8090`), gRPC (`:5005`), and Graftcode WS (`:5000`) backends — they must already be running.

## Build

```bash
npm run build
```

The Dockerfile is built by `deploy-azure.ps1` via ACR remote build; backend URLs are baked in as `VITE_*` build args.
