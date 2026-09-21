# Running the demo with HTTP/2

All three integration paths in `perf-lab` now run over **HTTP/2**. Browsers only
speak HTTP/2 over **TLS (h2)**, so REST and gRPC are served over HTTPS using a
locally-trusted [mkcert](https://github.com/FiloSottile/mkcert) certificate.

## One-time setup

```bash
# Trust a local CA and mint a cert for localhost (shared by all backends).
# The cert lives at official/certs/ — a sibling of the backend folders, since each
# backend looks for it at "<its own folder>/../certs" by default.
mkcert -install
mkdir -p official/certs && cd official/certs
mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1
```

Both backends auto-discover `../certs/localhost.pem` + `localhost-key.pem` relative to
their own folder — i.e. `official/certs/` (override with the `TLS_CERT` / `TLS_KEY` env vars).

## Run the three backends

| Service | Command | Endpoint | HTTP/2 |
|---------|---------|----------|--------|
| **REST** (C#/Kestrel) | `cd official/electric-company-ws && dotnet run --project be.csproj` | `https://localhost:8090/api/EnergyPrice/price` | h2 over TLS |
| **gRPC-Web** (C#/Kestrel) | `cd official/grpc-energy-price-dotnet && dotnet run` | `https://localhost:5005/energyprice.PriceService/GetPrice` | h2 over TLS |
| **Graftcode** (gg.exe) | see below | `http://localhost:5001/h2` (h2c); browser: `https://localhost:5173/graft/h2` | h2c behind Vite TLS |

> REST and gRPC both run on .NET/Kestrel so the comparison isolates the protocol,
> not the runtime. Both serve gRPC-Web/REST over the same mkcert TLS cert.

### Graftcode Gateway

```bash
cd official/electric-company-be
dotnet build EnergyPriceService.csproj          # produces the module DLL
gg.exe "bin/Debug/net8.0/EnergyPriceService.dll" \
    --runtime netcore \
    --http2Server=1 --http2Port 5001 \
    --port 5000 --httpPort 5002 \
    --corsAllowedOrigins=*
```

This starts three servers: WebSocket (5000), HTTP/2 (5001), Graftcode Vision (5002).

> **Browser:** Vite on `https://localhost:5173` uses the shared mkcert PEM.
> Same-origin **WSS** `/graft-ws` is proxied to `ws://127.0.0.1:5000/ws` (HTTPS
> pages cannot open `ws://`). A Vite plugin (`vite-graft-proxy.js`) also
> bridges `/graft/h2` → h2c `:5001/h2` (`node:http2.connect`, not `server.proxy`).
> gg 1.4.6 RST_STREAMs Node HTTP/2 `POST /h2` with `NGHTTP2_PROTOCOL_ERROR`
> (reproduced with the official hypertube Node client, without Vite). Until that
> works, the UI defaults to WSS; set `VITE_GRAFT_TRANSPORT=h2` to try `/graft/h2`.
> Native clients can still use `http://localhost:5001/h2` if their HTTP/2 stack
> is compatible.

## Frontend (perf-lab)

Copy `official/perf-lab/.env.example` to `.env`, install the graft from
`GET http://localhost:5000/npm` (`npm install --no-save --registry …`), then:

```bash
cd official/perf-lab
npm run dev
# Open https://localhost:5173  (mkcert — no cert warning after mkcert -install)
```

Restart Vite after changing `vite.config.js` or reinstalling the graft. The
dev server uses `strictPort: true` on 5173 — stop any leftover HTTP Vite first.
