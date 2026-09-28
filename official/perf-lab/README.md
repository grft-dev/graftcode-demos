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

### Static integration metrics (SLOC / tokens)

See [src/metrics/METRICS.md](src/metrics/METRICS.md).

## Environment variables

Copy values from [`.env.example`](.env.example) into `.env.local` (local Docker) or `.env.dev` (Azure); only `.env.example` is committed.

| Variable pair | REST | gRPC (browser) | Graftcode |
|---------------|------|----------------|-----------|
| `*_HTTP1` | `http://localhost:8090` | `http://localhost:5173/grpc` (Vite → Docker `:5005`) | `ws://localhost:5173/graft-ws` (Vite → gg `:5000/ws`) |
| `*_HTTP2` | Azure `demo-ecws` HTTPS URL | Azure `demo-grpc` HTTPS URL | Azure `demo-ecbe` `wss://…/ws` |

The in-app **HTTP version** control switches all three stacks together. Choice is stored in `localStorage` (`perf-lab-http-mode`). When HTTP/1 and HTTP/2 URLs are identical (e.g. `npm run dev:azure` with [`.env.dev`](.env.dev)), the picker is hidden.

Legacy fallbacks if pairs are omitted: `VITE_REST_URL`, `VITE_GRPC_URL`, `VITE_GRAFT_WS_URL`.

## Reading the sequential benchmark

- **REST** uses a simple `GET` and small JSON for `getPrice` — often fastest for tiny responses in the browser.
- **gRPC** in this app is **gRPC-Web** (Connect), not a native gRPC client: extra framing and `POST` overhead show up on small calls.
- **gRPC stream** with one point per call is mainly for protocol comparison; streaming wins on large payloads (not shown in the UI at the moment).
- **Graftcode** goes through the gateway and Hypertube protocol (WebSocket), which adds work per call compared to direct HTTP — the trade-off is zero handwritten integration code.

Use **HTTP/2** in the picker to put REST, gRPC, and Graft on the same Azure network path; use **HTTP/1.1** for local Docker + Vite proxies.

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
