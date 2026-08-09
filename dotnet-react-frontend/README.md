# Frontend → Backend (React → .NET)

**React calls your .NET `TripBudget` backend as a typed Graft. No REST client, no DTOs, no OpenAPI.**
Bonus: cross-language — a .NET backend called from a TypeScript/React frontend, with no wrapper in between.

> Graftcode's AI rules (`CLAUDE.md` + `.claude/rules/`) make Claude build this the Graftcode way
> automatically — plain class → `gg` → install the Graft from the `/npm` route → call it.
> This repo doesn't vendor those rules; add them to your own project from
> [grft-dev/graftcode-demos/rules](https://github.com/grft-dev/graftcode-demos/tree/main/rules)
> (see the root [README](../README.md#ai-assistant-rules-optional)).
>
> 🧪 Want to see the difference for yourself? **[`seed/`](seed/)** has this same backend class with
> neutral comments, so you can ask your assistant the identical prompt with and without the rules and
> compare what it writes.

## Prerequisites
- **Docker (running)** and **Node.js**.
- .NET SDK is **optional** — the Docker image builds the C# inside the container. You only need it
  locally if you want to scaffold/inspect the project with `dotnet` yourself.

## Part A — host your backend

```bash
# 1. Create the class library and drop in TripBudget.cs (+ the .csproj here)
dotnet new classlib -n TripBudgetService
# (replace Class1.cs with TripBudget.cs; use the TripBudgetService.csproj from this folder)

# 2. Build + host with the Graftcode Gateway
docker build --no-cache --pull -t tripbudget-dotnet:test . > build.log 2>&1 || tail -30 build.log
docker run -d -p 80:80 -p 81:81 --name graftcode_tripbudget tripbudget-dotnet:test
```

**Get the install command the AI-friendly way (no log scraping).** Poll the `/npm` route until it returns 200 — it's both the readiness check and the exact, current install command:

```bash
curl -sS --max-time 5 http://localhost:80/npm
# (also available: /nuget, /pypi, /libraries — /libraries is the full machine-readable contract)
```

> Port note: gg v1.2.x serves Vision on 81 (`http://localhost:81/GV`); **gg v1.3.0 serves it on the WS
> port (80)**. Read the actual port from the `gg` logs / use the route that responds. You can still use
> the Vision UI's "Try it out" to call `EstimateTotal` live from the browser.

## Part B — call it from React

```bash
# 3. Scaffold a React app
npm create vite@latest trip-frontend -- --template react
cd trip-frontend && npm install

# 4. Install the Graft — paste the EXACT command from the /npm route above
npm install --no-fund --no-audit --registry https://grft.dev/<GUID>__free @graft/nuget-tripbudgetservice@<version>
# (hypertube-nodejs-sdk may be required too — the /npm output / Vision will say)
```

5. Replace `src/App.jsx` with the `App.jsx` in this folder.
6. **Required for the browser build:** the generated client targets Node, so install `vite-plugin-node-polyfills` and add it to `vite.config.js`. Without it the page renders blank.

```bash
npm install -D vite-plugin-node-polyfills
```
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ globals: { Buffer: true, global: true, process: true }, protocolImports: true }),
  ],
})
```
```bash
npm run dev
# http://localhost:5173 → "Estimated trip cost: $1350.00"
#   5 x $120 = $600 lodging + 5 x $75 x 2 travelers = $750 spending = $1350
```

## Why this matters
- IDE autocomplete on `TripBudget.` — it's a **typed package**, not hand-written fetch code.
- You never wrote an endpoint, a DTO, or a client.
- Change the backend → rebuild → `npm update` the Graft. No re-syncing specs.

## Gotchas
- The Graft package name/registry GUID are generated per-gateway — **always copy from `/npm`**, never reuse an old GUID (it rotates per restart unless you pass `--projectKey`).
- After upgrading the Graft, **restart the Vite dev server** (HMR caches the old `node_modules`).
- Don't run a plain `npm install` afterward that resolves `@graft` from npmjs (→ 404) — reinstall from the lockfile.
