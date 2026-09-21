# Todos — doprowadzić do działania i przetestować wszystkie scenariusze

Stan po sesji UI 2026-09-21 (popołudnie). `[x]` = już zweryfikowane lokalnie. `[ ]` = do zrobienia.

Nie odpalać równolegle community gatewayów: wszystkie bindują host `:80` i `:81`.

---

## 0. Fundamenty (wspólne)

- [x] Node 22+ (`v22.19.0`)
- [x] Docker Desktop działa
- [x] `mkcert` zainstalowany (Scoop `extras/mkcert`; nie był w PATH — README go wymaga)
- [x] Certy: `official/certs/localhost.pem` + `localhost-key.pem` (`localhost`, `127.0.0.1`, `::1`)
- [x] `official/perf-lab/.env` skopiowany z `.env.example`
- [ ] Dodać w root README i w instrukcjach restore: `dotnet restore --source https://api.nuget.org/v3/index.json` **albo** repo-level `nuget.config` z `packageSourceMapping` (jak w OTel `CityWeatherService`). Bez tego `Swashbuckle` / `Grpc.AspNetCore` lecą na user-feed `grft.dev` i restore pada NU1301.
- [ ] Dodać `gg` (Graftcode Gateway) na PATH. Lokalnie jest `gg.exe` v1.4.6 w `%LOCALAPPDATA%\graftcode\bin\` (zip z GitHub `gg_windows_amd64`), **nie** w PATH — kolejne sesje i HTTP2-SETUP nadal tego wymagają.
- [ ] Windows `curl`: używać `--ssl-no-revoke` przy mkcert (Schannel `CRYPT_E_NO_REVOCATION_CHECK`). Wbudowany curl **nie obsługuje `--http2`** — HTTP/2 weryfikować w DevTools / logach Kestrel, nie samym curl.
- [ ] Zsynchronizować dokumentację z kodem (sekcja 8) — inaczej kolejne „odpal według README” znów padnie.

---

## 1. perf-lab — Graftcode vs REST vs gRPC

Scenariusze UI / benchmarku z README i `official/perf-lab`.

### 1.1 REST backend (`official/electric-company-ws`)

- [x] `dotnet run` po restore z nuget.org → `https://localhost:8090`
- [x] `GET /status` → 200 `healthy`
- [x] `GET /api/EnergyPrice/price` → 200 (liczba)
- [x] `GET /api/EnergyPrice/history?count=2` → 200 (JSON `PricePoint`)
- [x] W przeglądarce (zaufany cert mkcert): to samo bez `--ssl-no-revoke`, po HTTP/2 (ALPN)

### 1.2 gRPC-Web backend (`official/grpc-energy-price-dotnet`)

- [x] `dotnet run` po restore z nuget.org → `https://localhost:5005`
- [x] `GET /status` → 200
- [x] Unary `GetPriceHistory` z UI (ConnectRPC `callGrpcGetPriceHistory` → `:5005`) — Run comparison pokazuje czas gRPC
- [x] Unary `GetPrice` z UI — używane jako baseline narzutu gRPC (nie osobny przycisk)
- [x] Server-streaming `streamPrices` — UI woła `streamGrpcPrices` z `src/grpcClient.js` w Run comparison (wiersz **gRPC stream**); README obiecuje to porównanie i UI je ma.

### 1.3 Frontend Vite (`official/perf-lab`)

Ścieżka **B (żywy graft)** wdrożona lokalnie, **bez** GUID-a w lockfile (wariant A: ad-hoc `npm install --no-save` z `GET /npm`; `projectKey` później). Alias Vite na stub **usunięty** — zostaje tylko design-system + shim `crypto`. Stub `src/stubs/graft.js` leży na dysku, nieużywany. `@graft/nuget-EnergyPriceService` **nie** jest w `package.json` (martwy host Azure w lockfile byłby znowu ENOTFOUND). Wygenerowany klient ma camelCase: `getPrice` / `getPriceHistory`.

- [x] Ścieżka B: klient z `GET http://localhost:5000/npm`, `npm install --no-save --registry https://grft.dev/<GUID>__free @graft/nuget-energypriceservice@1.2.1`
- [ ] Po `projectKey` z portal.graftcode.com: ustabilizować GUID, dopiero wtedy wpis w `package.json` + lockfile (nie commitując `.npmrc` z tokenem)
- [x] `npm install` + `npm run dev` → `http://localhost:5173`
- [x] **Fetch One Price** — `EnergyPriceService.getPrice()` na żywym gg (ten sam call jest baseline’em narzutu)
- [x] **Run comparison** (5k punktów, 2026-09-21): REST JSON + KB, gRPC unary ConnectRPC `:5005`, **gRPC stream**, Graftcode WS `:5000` — czasy > 0 ms. Przykład: REST ~20 ms, gRPC unary ~18 ms, Graftcode ~7 ms (po odjęciu własnego narzutu)
- [x] Run comparison dla **1k / 20k / 50k** (Playwright + UI; stream wolniejszy od unary, wszystkie czasy > 0 ms)
- [x] Checkbox **Exclude Network Latency** — per ścieżka: mały call (`/price`, gRPC `GetPrice`, graft `getPrice`) jako baseline, odejmowany od własnego payloadu; czasy z dokładnością 0,1 ms. Stara heurystyka `min(REST,gRPC)*0.8` ścinała Graftcode do 0 ms na loopbacku
- [x] Kalkulator **Cloud Cost Savings** pojawia się po Run comparison (REST → Graftcode na Azure; wariantów AWS/GCP / RPS nie klikano osobno)
- [x] Fallback hosta: `App.jsx` `ws://localhost:5000/ws` (zgodnie z `.env.example` / HTTP2-SETUP; `:5001` to h2c)
- [x] Skrypt `test` + testy Playwright (`official/perf-lab/tests/payload-comparison.spec.js`) — Fetch One Price, latency checkbox, Run comparison 1k/20k/50k, kalkulator gRPC unary → Graftcode/REST. Wymaga żywych backendów.

### 1.4 Graftcode Gateway lokalnie (`official/electric-company-be` + HTTP2-SETUP)

Potrzebne dla ścieżki B i kolumny Graftcode „po sieci”, nie mock.

- [x] `dotnet build EnergyPriceService.csproj` (restore z nuget.org)
- [x] `gg.exe … EnergyPriceService.dll --runtime netcore --http2Server --http2Port 5001 --port 5000 --httpPort 5002` **bez** `--projectKey` (GUID rotuje przy restarcie)
- [x] Poll `http://localhost:5000/npm` → 200; komenda install stamtąd, nie z logów
- [x] WS z przeglądarki: `VITE_GRAFT_WS_URL=ws://localhost:5000/ws` — Run comparison woła `getPriceHistory` przez Hypertube
- [ ] HTTP/2 z przeglądarki: TLS reverse proxy na h2c `:5001` (`/h2`) — gg serwuje h2c, przeglądarka wymaga h2; bez proxy ten kanał nie zadziała
- [x] Z UI: payload comparison na żywym grafcie (nie mocku). Restart Vite po `npm install` grafu (HMR trzyma stary `node_modules`)

### 1.5 Docker gateway (`official/graftcode-gateway`, `official/electric-company-be/Dockerfile`)

- [ ] Zbudować `official/graftcode-gateway` (context: root repo — Dockerfile kopiuje `official/electric-company-be/`)
- [ ] Zbudować `official/electric-company-be/Dockerfile` (uwaga: `wget` bez `-q`, hardcode `gg_linux_amd64.deb`)
- [ ] Uruchomić, poll `/npm` / `/libraries`, jedna prawdziwa metoda `GetPrice` / `GetPriceHistory`
- [ ] **Nie** podawać fake `--projectKey` (kontener pada na decode JWT). Klucz tylko z portal.graftcode.com albo pominąć flagę.

### 1.6 Deploy Azure (README + `AZURE-DEPLOY.md` + `deploy-azure.ps1`)

- [ ] `az login`, extension `containerapp`, providerzy `Microsoft.App` / `Microsoft.OperationalInsights`
- [ ] `./deploy-azure.ps1 -Location westeurope`
- [ ] Publiczny URL frontendu: Large Payload comparison na prawdziwym TLS/latency
- [ ] Tear-down: `az group delete -n graftcode-perf-rg --yes --no-wait`

---

## 2. open-telemetry-demo — login, miasta, pogoda, JWT, HTTP/2

Brak `official/open-telemetry-demo/README.md`. Compose i frontend padły.

### 2.1 Naprawić backendy

- [ ] `CityWeatherService`: `WeatherFacade.cs` nie kompiluje się — `Weather` nie ma `location` / `current` (snake_case). Kontrakt brać z UGM `https://dotnetweatherapi.onrender.com/libraries` (lub `/nuget`), potem gettery PascalCase / `get_Location()` zgodnie z wygenerowanym pakietem. **Nie** zgadywać pól.
- [ ] `docker compose up --build` w `official/open-telemetry-demo`
- [ ] User service: `http://localhost:8080/nuget` (WS) i HTTP/2 `:8989` → 200
- [ ] Weather service: `http://localhost:8081/nuget` i HTTP/2 `:8990` → 200
- [ ] JWT: login `wad` / `password` (z `.prompts/Fullsystem.prompt`); metody biznesowe odrzucają brak/zły Bearer (`RequestContext`, `--useContext=1`)

### 2.2 Frontend

- [ ] Przywrócić albo usunąć `frontend/scripts/install-grafts.mjs` i `frontend/scripts/smoke.mjs` (`package.json` je woła, plików nie ma — `npm run smoke` → `MODULE_NOT_FOUND`)
- [ ] Poprawić lockfile: `@graft/nuget-userservice` i `@graft/nuget-cityweatherservice` resolvują ten sam martwy Azure host. Po wstaniu compose wziąć komendy z `/npm` na `:8080` i `:8081`.
- [ ] `npm install` + `npm run dev` (HTTPS Vite `:5173`, proxy `/users/h2` i `/weather/h2`)
- [ ] **Login** → lista miast → **pogoda dla miasta**
- [ ] Wylogowanie czyści headery GraftConfig
- [ ] Request bez JWT na weather/cities → błąd (nie dane)

### 2.3 Promptowane rozszerzenia (`.prompts/`) — gdy bazowy flow działa

- [ ] `AddFarenheitService.prompt` — nowy serwis C→F po WS, weather zawsze zwraca F, bez zmiany kontraktu FE
- [ ] `MergeFarenheitAsMonolith.prompt` — ten sam graft `inmemory` w `CityWeatherService`
- [ ] `Countries.prompt` — tablica krajów, zdalnie, **bez auth**, FE bez zmian

---

## 3. sdn-currency-converter

- [x] `python -m unittest discover -s official/sdn-currency-converter/tests -v` — 6/6
- [ ] Dopisać w README demo: jak odpalić testy (teraz jedna linia)
- [ ] Docker: `gg --runtime python --modules .../converter.py --port 5002`
- [ ] Poll Vision/language route, wywołać `SimpleCurrencyConverter.convert` przez graft (nie tylko unittest in-process)
- [ ] Dockerfile: `wget -q`, `gg_linux_${ARCH}.deb` zamiast hardcode amd64

---

## 4. community/dotnet-react-frontend — React → .NET Graft

Backend Docker **działa**. Brak gotowej appki React w folderze (jest tylko `App.jsx` do wklejenia).

- [x] `docker build -t tripbudget-dotnet:test .`
- [x] `docker run -p 80:80 -p 81:81`, `GET http://localhost:80/npm` → 200 (`@graft/nuget-tripbudgetservice`)
- [ ] Scaffold Vite React **w folderze demo** (albo nowy podfolder `frontend/`), nie jednorazowy scratch poza repo
- [ ] `npm install` **dokładną** komendą z `/npm` (GUID rotuje bez `--projectKey`)
- [ ] `vite-plugin-node-polyfills` w `vite.config.js` (bez tego pusty ekran — README)
- [ ] Wkleić `App.jsx` → `npm run dev` → **Estimated trip cost: $1350.00** (5×120 + 5×75×2)
- [ ] Restart Vite po upgrade grafu (HMR trzyma stary `node_modules`)

---

## 5. community/js-mcp-backend — JS → MCP (Claude)

Gateway **działa**. Claude nie był weryfikowany.

- [x] Docker build + run; `GET :81/npm` → 200
- [x] `GET :81/mcp` i `:80/mcp` → **405** (transport MCP nie jest GET — endpoint żyje)
- [ ] Wywołać narzędzia po HTTP (initialize / tools/list / tools/call), nie tylko GET
- [ ] Claude Code: `claude mcp add --transport http trip-budget http://localhost:81/mcp` w nowej sesji
- [ ] Pytania: nightly rate Tokyo → **140**; Lisbon 5 nocy / 2 osoby → **1225**
- [ ] Claude Desktop: merge `claude_desktop_config.json` (`mcp-remote` → `:81/mcp`), restart, te same pytania
- [ ] Prywatna tabela `NIGHTLY_RATES` **nie** jest tool; tylko `getNightlyRate` / `estimateTotal`

---

## 6. community/py-ai-backend — dwa tory MCP

### 6.1 Skrypt i lokalny FastMCP

- [x] `python community/py-ai-backend/energy_price_calculator.py` — print ceny i rachunku
- [ ] `python -m venv venv` + `pip install mcp`
- [ ] `python mcp_server.py` (stdio)
- [ ] Claude Desktop: `energy-calculator` → venv python + `mcp_server.py`
- [ ] „What is the current energy price?” / „If I use 150 kWh, how much is my bill?”

### 6.2 Gateway Docker

- [x] Build + run; `GET :81/npm` → 200 (`@graft/pypi-energy-service`)
- [x] `GET /mcp` → 405
- [ ] tools/call na gatewayu (jak JS MCP)
- [ ] Claude Desktop: `mcp-remote` → `http://localhost:81/mcp` (blok `energy-service` z README)
- [ ] Dockerfile: `wget -q` (teraz dumpuje cały progress gg.deb)

---

## 7. Community `seed/` — porównanie z / bez reguł AI

Nie jest „apką do odpalenia”, ale jest scenariuszem README.

- [ ] `community/dotnet-react-frontend/seed/` — ten sam backend, neutralne komentarze
- [ ] `community/js-mcp-backend/seed/` — analogicznie
- [ ] Opcjonalnie: ten sam prompt z `rules/` i bez, porównać czy asystent idzie w Graftcode vs REST

---

## 8. Dokumentacja — bez tego nikt nie powtórzy ścieżki

- [ ] Root README **Run locally**: dodać gateway (HTTP2-SETUP), `.env.example` → `.env`, nuget.org / `nuget.config`, prywatny npm / lockfile, `mkcert` w tym `::1`
- [ ] Tabela Graftcode: albo „mocked locally” + alias Vite, albo „przez gg WS/HTTP2” — dziś README kłamie względem `vite.config.js`
- [ ] README: 1000 back-to-back calls — w `App.jsx` tego biegu nie widać (jest Fetch One Price + payload + kalkulator kosztów). Przywrócić UI albo poprawić opis.
- [x] Streaming gRPC: podpiąć albo wyciąć z README
- [ ] Tech stack: REST to kontrolery, nie minimal API (`EnergyPriceController`)
- [ ] Napisać `official/open-telemetry-demo/README.md` (Owner, compose, Vite, JWT, porty 8080/8081/8989/8990/5173)
- [ ] Community README: wariant „kod już jest w folderze — `docker build` stąd”, nie tylko `dotnet new` / `mkdir`
- [ ] `official/sdn-currency-converter/README.md` — testy + docker
- [ ] SDK w README: .NET 8 vs zainstalowany 10 — projekty `net8.0` wstają na nowszym SDK; dopisać albo pin
- [ ] CONTRIBUTING „Any tests pass locally” — albo dodać prawdziwe testy (Playwright / smoke.mjs), albo jasno: unittest tylko w currency-converter

---

## Kolejność, która nie zderza portów

1. Lockfile OTel (2.2) — perf-lab UI już wstaje bez GUID-a w lockfile (ad-hoc `--no-save`).
2. Dokończyć perf-lab: `gg` na PATH, `projectKey` (później), HTTP/2 proxy `:5001`.
3. OTel: kompilacja weather → compose → graft install → login/pogoda.
4. Community: po jednym na `:80/:81` — najpierw HTTP tools/call, potem Claude.
5. Currency converter przez `gg`.
6. Azure perf-lab na końcu (osobna subskrypcja, nie blokuje lokalnego).
7. Dopiero wtedy zsynchronizować README z tym, co faktycznie działa.
