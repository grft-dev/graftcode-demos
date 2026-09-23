# Integration metrics (Graftcode vs REST vs gRPC)

Static, one-shot measurement. The perf-lab UI does **not** recompute these. Numbers live in
`loc-comparison.json` and `token-comparison.json`. Re-run from `scripts/`:

```bash
cd scripts && npm install && npm run measure
```

- Measured at: `2026-09-23T11:08:23.427Z`
- Git SHA: `ac9b795a007075e1305f0f0e0f49963fa3f2508c`
- SLOC tool: custom cloc-style scanner (code lines; `//` and `/* */` comments and blank lines excluded)
- Tokens: `js-tiktoken` **cl100k_base** on committed source (proxy, not a live prompt session)

## What is counted (EnergyPrice slice — headline)

Perf-lab only calls `getPrice` / `getPriceHistory`.

| Bucket | REST | gRPC | Graftcode |
| --- | --- | --- | --- |
| Domain + facade | `electric-company-ws/EnergyPriceService.cs` | `PriceServiceImpl.cs` (inline RNG; includes StreamPrices) | `electric-company-be/EnergyPriceService.cs` |
| Integration (server) | `EnergyPriceController`, `PriceHistoryDtos`, `Program.cs` | `price.proto`, `Program.cs` | none (`gg` hosts the DLL; binary not counted) |
| Client | `App.jsx` REST fetch excerpt (lines 134, 137–146) | `priceProto.js` + `grpcClient.js` | `App.jsx` import + GraftConfig + calls (lines 3, 66–83, 85–92, 160–163) |

**Not counted:** `node_modules`, `obj/`, `.graftcode/`, generated Graft client, generated `protoc` C#, `gg` / Kestrel binaries, Dockerfiles, Playwright, comments, blanks.

**Not in the headline:** [`official/electric-company-be/BusinessLogic.cs`](../../../electric-company-be/BusinessLogic.cs). It is compiled into the hosted DLL and *may* be exported by the gateway, but `EnergyPriceService` and perf-lab never call it. REST billing controllers use a copy of that logic; the lab does not hit those endpoints. gRPC has no `BusinessLogic` file.

**Shape caveat:** Graftcode `GetPriceHistory` returns `double[]`; REST and gRPC return `PricePoint` records.

**gRPC extra:** `StreamPrices` has no REST/Graftcode counterpart. It is included in the gRPC column and called out, not subtracted.

## EnergyPrice slice results (SLOC = code lines)

| Stack | Files | SLOC | Integration+client SLOC | Tokens (all) | Tokens (integration+client) | Public methods / RPCs |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| REST | 5 | 130 | 122 | 1357 | 1321 | GetPrice, GetHistory |
| gRPC | 5 | 197 | 148 | 2263 | 1777 | GetPrice, GetPriceHistory, StreamPrices |
| Graftcode | 2 | 43 | 27 | 462 | 364 | GetPrice, GetPriceHistory |

Headline reductions (positive = destination is smaller):

| From → to | SLOC total | SLOC integration+client | Tokens total | Tokens integration+client |
| --- | ---: | ---: | ---: | ---: |
| REST → Graftcode | 66.9% | 77.9% | 66% | 72.4% |
| gRPC → Graftcode | 78.2% | 81.8% | 79.6% | 79.5% |
| REST → gRPC | -51.5% | -21.3% | -66.8% | -34.5% |

Suggested later UI copy (do not paste into `App.jsx` in this step): Graftcode uses **77.9%** less handwritten integration+client code than REST and **81.8%** less than gRPC for GetPrice/GetPriceHistory.

## Token proxy disclaimer

`token-comparison.json` tokenizes the **same committed files** as the SLOC table. It is *estimated tokens of handwritten integration code*, not tokens consumed by an agent that built REST vs gRPC vs Graftcode from one prompt. Graftcode AI rules (`rules/`) are **not** added to T_rules here.

A same-prompt experiment (see `community/dotnet-react-frontend/seed/README.md`) was not run.

## Appendix: full surface (not the lab path)

REST SLOC 550 vs Graftcode SLOC 169 (69.3% reduction). gRPC: Demo implements only PriceService RPCs; no billing/meter/tariff/outage/loyalty.

Do not quote this as “the same business logic the lab runs.”
