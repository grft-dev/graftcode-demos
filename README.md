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

**Live demo:** https://perf-lab.graydesert-edb65f66.northeurope.azurecontainerapps.io

## Repo layout

```
perf-lab/                  React/Vite frontend (performance benchmark UI)
electric-company-ws/       .NET 8 REST backend  (HTTP/2, /api/EnergyPrice/*)
grpc-energy-price-dotnet/  .NET 8 gRPC backend  (HTTP/2, ASP.NET Core gRPC-Web)
electric-company-be/       Original C# energy-price service (Graftcode host)
sdn-currency-converter/    Python currency-converter demo
deploy-azure.ps1           One-shot Azure Container Apps deploy script
```

## Run locally

### Prerequisites

- Node 22+
- .NET 8 SDK
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS / HTTP/2)

### 1 — Local TLS certs

```powershell
mkcert -install
New-Item -ItemType Directory -Force certs
mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1
```

### 2 — REST backend

```powershell
cd electric-company-ws
dotnet run
# Listening on https://localhost:8090
```

### 3 — gRPC backend

```powershell
cd grpc-energy-price-dotnet
dotnet run
# Listening on https://localhost:5005
```

### 4 — Frontend

```powershell
cd perf-lab
npm install
npm run dev
# Open http://localhost:5173
```

The `.env` in `perf-lab/` already points to `https://localhost:8090` (REST) and `https://localhost:5005` (gRPC). Copy `.env.example` to `.env` if you need to change the URLs.

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
