# perf-lab

React/Vite performance benchmark that measures Graftcode, REST, and gRPC side-by-side.

Backend source for this demo lives in **this repo** under `official/`:

| Role | Folder |
|------|--------|
| REST | [`electric-company-ws`](../electric-company-ws/) |
| gRPC-Web | [`grpc-energy-price-dotnet`](../grpc-energy-price-dotnet/) |
| Graftcode (gg **v1.4.7** in Docker) | [`electric-company-be`](../electric-company-be/) |

The Graftcode team also deploys the same services to Azure from the internal [demos](https://github.com/grft-dev/demos) repo (`demo-ecws`, `demo-grpc`, `demo-ecbe`). Use `.env.dev` when pointing the UI at those hosted URLs only.

## What it does

### Sequential call benchmark

Many sequential `getPrice` calls per path (REST, gRPC unary, gRPC stream, Graftcode) with per-path progress.

### Cloud Cost Savings calculator

Extrapolates measured per-call time from the sequential benchmark to annual cost savings.

### Code and AI token cost

Shows the tokens Cursor's agent spent to connect the same 20 C# methods to a React page. Both agents read the same C# and neither was given a method list. REST's rule asks for a request type and a response type per method, one C# type per file. Across 8 runs its median was 164,133 tokens. Graftcode direct calls, 5 runs of the current rule, were 87,114, which is 46.9% fewer. The business logic was unchanged in both.

The section reads [src/metrics/ai-token-cost.json](src/metrics/ai-token-cost.json). [experiments/ai-integration](../../experiments/ai-integration/README.md) writes it from the recorded runs and the two example results. `node verify.mjs` there runs both agents and writes `.scratch/report.html`, the comparison page for your own runs. To check that the page data still matches the committed runs:

```bash
cd experiments/ai-integration
npm ci
node export-page.mjs --check
```

The static line and tokenizer counts for `getPrice` are still checked by `cd scripts && npm ci && npm run metrics:check`. See [src/metrics/METRICS.md](src/metrics/METRICS.md).

## Environment variables

Copy values from [`.env.example`](.env.example) into `.env.local` (local Docker) or `.env.dev` (Azure); only `.env.example` is committed.

| Variable pair | REST | gRPC (browser) | Graftcode |
|---------------|------|----------------|-----------|
| `*_HTTP1` | `http://localhost:8090` or Azure `demo-ecws` (`ingress_transport=http`) | `http://localhost:5173/grpc` or Azure `demo-grpc-h1` | `ws://localhost:5173/graft-ws` or Azure `demo-ecbe` `wss://…/ws` |
| `*_HTTP2` | Azure `demo-ecws-h2` | Azure `demo-grpc` | Azure `demo-ecbe-h2` `https://…/h2` (ingress `http2` → gg `:81`; requires gg + ACA CORS) |

REST, gRPC, and Graft use **HTTP/1.1** on `/`. Open **`/http2`** (e.g. `http://localhost:5173/http2` or `…/graftcode-demos/http2` on GitHub Pages) for Azure **HTTP/2** twins (Graft → `https://…/h2`). The in-app HTTP version picker is disabled; set `HTTP_BACKEND_HTTP2_UI_ENABLED` in `httpBackendConfig.js` to restore it for experiments.

Legacy fallbacks if pairs are omitted: `VITE_REST_URL`, `VITE_GRPC_URL`, `VITE_GRAFT_WS_URL`.

## Reading the sequential benchmark

- **REST** uses a simple `GET` and small JSON for `getPrice` — often fastest for tiny responses in the browser.
- **gRPC** in this app is **gRPC-Web** (Connect), not a native gRPC client: extra framing and `POST` overhead show up on small calls.
- **gRPC stream** with one point per call is mainly for protocol comparison; streaming wins on large payloads (not shown in the UI at the moment).
- **Graftcode** goes through the gateway and Hypertube protocol (WebSocket), which adds work per call compared to direct HTTP — the trade-off is zero handwritten integration code.

Use **`/http2`** for REST, gRPC, and Graft on the Azure h2 twins. Use **`/`** for local Docker + Vite proxies (HTTP/1.1).

## Local development

### Docker (recommended)

From `official/perf-lab`:

```bash
npm install
# create .env.local from .env.example (see HTTP/1.1 block)
npm run backends:up    # builds ../electric-company-ws, ../grpc-energy-price-dotnet, ../electric-company-be
npm run dev            # http://localhost:5173
```

Stop backends: `npm run backends:down`

Graft npm client (**1.3.0**):

```bash
npm install --registry https://grft.dev/6d44e8fa-78dc-4f89-b04f-8f0161172d31__free @graft/nuget-energypriceservice@1.3.0
```

(Or copy `.npmrc.example` → `.npmrc` and `npm install`.)

### Azure dev (hosted backends)

```bash
npm run dev:azure      # loads .env.dev (polandcentral Container Apps)
```

### Native .NET + mkcert

TLS on `https://localhost:8090` / `:5005` without Docker — [HTTP2-SETUP.md](../../HTTP2-SETUP.md) and [repo README](../../README.md).

## Project structure

```
official/perf-lab/     This UI
../electric-company-ws/   REST
../grpc-energy-price-dotnet/
../electric-company-be/
```

## Build

```bash
npm run build
```

## GitHub Pages

See `.github/workflows/deploy-perf-lab-pages.yml`. Set GitHub repository variables: `VITE_REST_URL_HTTP1` / `HTTP2`, `VITE_GRPC_URL_HTTP1` / `HTTP2`, `VITE_GRAFT_WS_URL_HTTP1` / `HTTP2` (and optional legacy `PERF_LAB_REST_URL`, `PERF_LAB_GRPC_URL`, `PERF_LAB_GRAFT_WS_URL`).
