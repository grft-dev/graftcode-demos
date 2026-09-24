# Integration metrics (Graftcode vs REST vs gRPC)

Static, one-shot measurement. The perf-lab UI does **not** recompute these. Numbers live in
`loc-comparison.json` and `token-comparison.json`. Re-run from `scripts/`:

```bash
cd scripts && npm install && npm run measure
```

- Measured at: `2026-09-24T10:06:33.434Z`
- Git SHA: `c7e6190a3ede123cef72b6c1de661d193da7847e`
- SLOC tool: custom cloc-style scanner (code lines; `//` and `/* */` comments and blank lines excluded)
- Tokens: `js-tiktoken` **cl100k_base** on committed source (proxy, not a live prompt session)

## What is counted (EnergyPrice slice — headline)

Perf-lab only calls `getPrice` / `getPriceHistory`.

| Bucket | REST | gRPC | Graftcode |
| --- | --- | --- | --- |
| Domain + facade | `electric-company-ws/EnergyPriceService.cs` | `PriceServiceImpl.cs` (inline RNG; includes StreamPrices) | `electric-company-be/EnergyPriceService.cs` |
| Integration (server) | `EnergyPriceController`, `Program.cs` | `price.proto`, `Program.cs` | none (`gg` hosts the DLL; binary not counted) |
| Client | `App.jsx` REST fetch excerpt (lines 158–166) | `priceProto.js` + `grpcClient.js` | `App.jsx` import + GraftConfig + calls (lines 3, 87–104, 106–113, 180–184) |

**Not counted:** `node_modules`, `obj/`, `.graftcode/`, generated Graft client, generated `protoc` C#, `gg` / Kestrel binaries, Dockerfiles, Playwright, comments, blanks.

**Not in the headline:** [`official/electric-company-be/BusinessLogic.cs`](../../../electric-company-be/BusinessLogic.cs). It is compiled into the hosted DLL and *may* be exported by the gateway, but `EnergyPriceService` and perf-lab never call it. REST billing controllers use a copy of that logic; the lab does not hit those endpoints. gRPC has no `BusinessLogic` file.

**Payload shape:** `GetPriceHistory` returns the same `double[]` through Graftcode, REST, and gRPC.

**gRPC extra:** `StreamPrices` has no REST/Graftcode counterpart. It is included in the gRPC column and called out, not subtracted.

## EnergyPrice slice results (SLOC = code lines)

| Stack | Files | SLOC | Integration+client SLOC | Tokens (all) | Tokens (integration+client) | Public methods / RPCs |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| REST | 4 | 103 | 95 | 1067 | 1031 | GetPrice, GetHistory |
| gRPC | 5 | 168 | 134 | 1896 | 1537 | GetPrice, GetPriceHistory, StreamPrices |
| Graftcode | 2 | 44 | 28 | 478 | 380 | GetPrice, GetPriceHistory |

Headline reductions (positive = destination is smaller):

| From → to | SLOC total | SLOC integration+client | Tokens total | Tokens integration+client |
| --- | ---: | ---: | ---: | ---: |
| REST → Graftcode | 57.3% | 70.5% | 55.2% | 63.1% |
| gRPC → Graftcode | 73.8% | 79.1% | 74.8% | 75.3% |
| REST → gRPC | -63.1% | -41.1% | -77.7% | -49.1% |

Suggested later UI copy (do not paste into `App.jsx` in this step): Graftcode uses **70.5%** less handwritten integration+client code than REST and **79.1%** less than gRPC for GetPrice/GetPriceHistory.

## Token proxy disclaimer

`token-comparison.json` tokenizes the **same committed files** as the SLOC table. It is *estimated tokens of handwritten integration code*, not tokens consumed by an agent that built REST vs gRPC vs Graftcode from one prompt. Graftcode AI rules (`rules/`) are **not** added to T_rules here.

A same-prompt experiment (see `community/dotnet-react-frontend/seed/README.md`) was not run.

## Appendix: full surface (not the lab path)

REST SLOC 524 vs Graftcode SLOC 169 (67.7% reduction). gRPC: Demo implements only PriceService RPCs; no billing/meter/tariff/outage/loyalty.

Do not quote this as “the same business logic the lab runs.”
