# Deploying the perf-lab to Azure Container Apps (a real-environment test)

This runs the demo on real cloud infrastructure with real TLS, real bandwidth, and
real latency — so the REST-vs-gRPC numbers reflect a deployed environment, not
loopback. Nothing is throttled or faked.

## Why this is a fair, real test

| Service | Container serves | Ingress transport | Browser gets |
|---------|------------------|-------------------|--------------|
| REST (`electric-company-ws`) | cleartext HTTP/1.1 on `$PORT` | `auto` | HTTP/2 (negotiated at ingress) |
| gRPC (`grpc-energy-price-dotnet`) | cleartext **h2c** on `$PORT` | **`http2`** | HTTP/2 (gRPC-Web preserved) |
| Frontend (`perf-lab`) | nginx static on `:81` | `auto` | HTTP/2 |

The Container Apps ingress terminates TLS with a real, browser-trusted certificate,
so there are no cert warnings and `mkcert` is not involved in the cloud.

> The gRPC app **must** use `--transport http2` or the ingress downgrades it and the
> comparison is meaningless. The deploy script sets this for you.

## Prerequisites

```bash
az login
az extension add --name containerapp --upgrade
az provider register -n Microsoft.App
az provider register -n Microsoft.OperationalInsights
```

You need Contributor on a subscription. No local Docker required — images are built
in the cloud with `az acr build`.

## Deploy

```powershell
# From the repo root. Pick a region near you for representative latency.
./deploy-azure.ps1 -Location westeurope
```

The script:
1. Creates a resource group + Azure Container Registry.
2. Builds the REST and gRPC images in ACR.
3. Creates the Container Apps environment and deploys both backends (with the
   correct ingress transports), capturing their public FQDNs.
4. Builds the frontend image **with the backend FQDNs baked in** (`VITE_REST_URL`,
   `VITE_GRPC_URL` are build-time args), then deploys it.
5. Prints the demo URL.

Open the printed `https://<perf-lab>.azurecontainerapps.io` and run the
**Large Payload & Streaming** comparison. Over a real network the ~49%-smaller
protobuf payload now saves actual transfer time, so gRPC should look much better
than it does on localhost.

## What to expect vs localhost

- **Trivial 1k calls:** still ~tied (latency-bound, one round trip each).
- **Large payload (5k–50k points):** gRPC improves relative to localhost because the
  smaller payload is cheaper to move over a bandwidth-limited link. How far it tips
  depends on the bandwidth/latency between your browser and the region.
- **Browser caveat:** the browser still uses gRPC-Web + JS protobuf decode (slower
  than native `JSON.parse`). The single most gRPC-favorable test is **service-to-
  service native gRPC**, not a browser — ask if you want that variant added.

## Tear down

```bash
az group delete -n graftcode-perf-rg --yes --no-wait
```
