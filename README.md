# graftcode-demos

Practical demos showing how Graftcode connects services directly — no integration layer required. Each demo compares Graftcode against standard REST and gRPC so you can see the performance difference on real data.

## Demos

### perf-lab — Performance Lab

Runs 1 000 back-to-back calls across three paths and plots the results:

| Path | Runtime | Protocol |
|------|---------|---------|
| **Graftcode** | in-process (mocked locally) | direct / no network |
| **REST** | .NET 8 / Kestrel | HTTP/2 + JSON |
| **gRPC** | .NET 8 / Kestrel + ASP.NET Core gRPC-Web | HTTP/2 + protobuf |

Also includes a **Large Payload & Streaming** section that sends one call returning thousands of `PricePoint` records and compares REST (JSON) vs gRPC unary (protobuf) vs gRPC server-streaming — so you can see the payload-size and decode trade-offs on a real network.

### Community demos

Focused, single-integration demos — see [CONTRIBUTING.md](CONTRIBUTING.md) for how these differ
from the perf-lab system above.

| Demo | Shows |
|------|-------|
| [dotnet-react-frontend](community/dotnet-react-frontend/) | React frontend calling a .NET backend as a typed Graft |
| [js-mcp-backend](community/js-mcp-backend/) | Plain JS module auto-exposed to Claude as MCP tools |
| [py-ai-backend](community/py-ai-backend/) | Python service exposed as an MCP server (local + gateway approaches) |

### Official demos

Full/reference systems built by the Graftcode team — see [CONTRIBUTING.md](CONTRIBUTING.md) for
how these differ from the Community demos above.

| Demo | Shows |
|------|-------|
| [perf-lab](official/perf-lab/) — Performance Lab | Graftcode vs REST vs gRPC benchmark (detailed above) |
| [open-telemetry-demo](official/open-telemetry-demo/) | Multi-service app instrumented with OpenTelemetry |
| [sdn-currency-converter](official/sdn-currency-converter/) | Standalone Python currency-conversion library |

## Repo layout

```
community/                     External-contributor demos (see CONTRIBUTING.md)
  dotnet-react-frontend/      React → .NET Graft
  js-mcp-backend/             JS module → MCP tools
  py-ai-backend/              Python service → MCP server

official/                     Graftcode-team demos (see CONTRIBUTING.md)
  perf-lab/                   React/Vite frontend (performance benchmark UI)
  electric-company-ws/        .NET 8 REST backend  (HTTP/2, /api/EnergyPrice/*)
  grpc-energy-price-dotnet/   .NET 8 gRPC backend  (HTTP/2, ASP.NET Core gRPC-Web)
  electric-company-be/        Original C# energy-price service (Graftcode host)
  graftcode-gateway/          Graftcode Gateway container used by the demos above
  sdn-currency-converter/     Python currency-converter demo
  open-telemetry-demo/        Multi-service OpenTelemetry demo

rules/                        Shared AI-assistant rules (see below) — used by both
deploy-azure.ps1              One-shot Azure Container Apps deploy script
```

## Run locally

### Prerequisites

- Node 22+
- .NET 8 SDK
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS / HTTP/2)

### 1 — Local TLS certs

```powershell
mkcert -install
New-Item -ItemType Directory -Force official/certs
mkcert -cert-file official/certs/localhost.pem -key-file official/certs/localhost-key.pem localhost 127.0.0.1
```

### 2 — REST backend

```powershell
cd official/electric-company-ws
dotnet run
# Listening on https://localhost:8090
```

### 3 — gRPC backend

```powershell
cd official/grpc-energy-price-dotnet
dotnet run
# Listening on https://localhost:5005
```

### 4 — Frontend

`@graft/nuget-EnergyPriceService` is not on npmjs. Copy the example npmrc, then install:

```powershell
cd official/perf-lab
Copy-Item .npmrc.example .npmrc
npm install
npm run dev
# Open http://localhost:5173
```

`.npmrc` is gitignored. It only needs this line (no token):

```
@graft:registry=https://grft.dev/019d9fab-b7c0-73af-8344-d6b7a2aef977__graftcode
```

The `.env` in `official/perf-lab/` already points to `https://localhost:8090` (REST) and `https://localhost:5005` (gRPC). Copy `.env.example` to `.env` if you need to change the URLs.

## Deploy to Azure

```powershell
az login
az extension add --name containerapp --upgrade
./deploy-azure.ps1
```

The script builds all three images in ACR (no local Docker needed), deploys them as Container Apps with external HTTPS ingress, and prints the frontend URL when done.

Tear down when finished:

```powershell
az group delete -n graftcode-perf-rg --yes --no-wait
```

See `AZURE-DEPLOY.md` for full details and troubleshooting notes.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7 |
| gRPC client | ConnectRPC (`@connectrpc/connect-web`) |
| gRPC server | ASP.NET Core gRPC-Web (`Grpc.AspNetCore.Web`) |
| REST server | ASP.NET Core minimal API |
| Containerisation | Docker → Azure Container Registry → Azure Container Apps |

## AI assistant rules (optional)

The [rules/](rules/) folder has ready-to-use Graftcode rules for common AI coding assistants
(Cursor, Copilot, Continue, Windsurf, Cline, Claude Code, Aider) — they teach the assistant to
default to Graftcode instead of hand-writing REST/gRPC APIs. Several Community demos above
reference these; copy the folder matching your tool into your own project's root (see
[rules/README.md](rules/README.md)).

## Contributing

New demo, whether an Official Demo or a Community Demo? See
[CONTRIBUTING.md](CONTRIBUTING.md) for folder naming, the README template to start from,
ownership (`.github/CODEOWNERS`), and the checklist a PR needs to pass.
