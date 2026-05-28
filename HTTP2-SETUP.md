# Running the demo with HTTP/2

All three integration paths in `perf-lab` now run over **HTTP/2**. Browsers only
speak HTTP/2 over **TLS (h2)**, so REST and gRPC are served over HTTPS using a
locally-trusted [mkcert](https://github.com/FiloSottile/mkcert) certificate.

## One-time setup

```bash
# Trust a local CA and mint a cert for localhost (shared by all backends)
mkcert -install
mkdir -p certs && cd certs
mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1
```

Both backends auto-discover `../certs/localhost.pem` + `localhost-key.pem`
(override with the `TLS_CERT` / `TLS_KEY` env vars).

## Run the three backends

| Service | Command | Endpoint | HTTP/2 |
|---------|---------|----------|--------|
| **REST** (C#/Kestrel) | `cd electric-company-ws && dotnet run --project be.csproj` | `https://localhost:8090/api/EnergyPrice/price` | h2 over TLS |
| **gRPC-Web** (C#/Kestrel) | `cd grpc-energy-price-dotnet && dotnet run` | `https://localhost:5005/energyprice.PriceService/GetPrice` | h2 over TLS |
| **Graftcode** (gg.exe) | see below | `http://localhost:5001` | **h2c (cleartext)** |

> REST and gRPC both run on .NET/Kestrel so the comparison isolates the protocol,
> not the runtime. Both serve gRPC-Web/REST over the same mkcert TLS cert.

### Graftcode Gateway

```bash
cd electric-company-be
dotnet build EnergyPriceService.csproj          # produces the module DLL
gg.exe "bin/Debug/net8.0/EnergyPriceService.dll" \
    --runtime netcore \
    --http2Server --http2Port 5001 \
    --port 5000 --httpPort 5002
```

This starts three servers: WebSocket (5000), HTTP/2 (5001), Graftcode Vision (5002).

> **Browser caveat:** the gateway serves HTTP/2 **cleartext (h2c)**, which browsers
> do not support. The perf-lab browser app therefore can't hit `:5001` directly.
> For a browser-based benchmark, terminate TLS in front of the gateway with a
> reverse proxy (caddy/nginx: `https://localhost:5001` → h2c `:5001`), or use the
> gateway's WebSocket transport on `:5000`. Native clients can use h2c directly.

## Frontend (perf-lab)

The React app depends on private Graftcode npm packages
(`@graft/nuget-EnergyPriceService`, `@graftcode/design-system`) that are not on the
public registry, so `npm install` requires access to Graftcode's private registry.
Once installed, copy `.env.example` to `.env` and run `npm run dev`.
