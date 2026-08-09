# AI (MCP) → Backend (Claude → JS module)

**A plain JS `TripBudget` module is auto-exposed as MCP tools. Claude discovers and calls your real methods — no MCP server code, no tool definitions, no schemas.**

> Graftcode's AI rules make assistants write the module the Graftcode way (public static methods, simple
> types) so it exposes cleanly as MCP tools. This repo doesn't vendor those rules; add them to your own
> project from [grft-dev/graftcode-demos/rules](https://github.com/grft-dev/graftcode-demos/tree/main/rules)
> (see the root [README](../README.md#ai-assistant-rules-optional)).
>
> 🧪 Want to see the difference for yourself? **[`seed/`](seed/)** has this same module with neutral
> comments, so you can ask your assistant the identical prompt with and without the rules and compare
> what it writes.

## Prerequisites
- Docker (running), Node.js, and Claude (Claude Code or Claude Desktop).

## Steps

```bash
# 1. Project with index.js + package.json (this folder)
mkdir trip-budget-ai && cd trip-budget-ai
# add index.js, package.json, Dockerfile

# 2. Host with the Graftcode Gateway
docker build --no-cache --pull -t trip-budget-ai:test . > build.log 2>&1 || tail -30 build.log
docker run -d -p 80:80 -p 81:81 --name graftcode_tripbudget_mcp trip-budget-ai:test

# 3. Confirm readiness via the route (don't scrape docker logs)
curl -sS --max-time 5 http://localhost:81/npm        # readiness + Graft install command
# /libraries shows the full machine-readable contract; the MCP endpoint is /mcp
```

> Port note: gg v1.3.0 may serve Vision + MCP on the WS port (80) instead of 81 — read the `gg` logs and
> point your AI tool at whichever port responds. Vision UI: `http://localhost:81/GV` ("Try it out" calls methods live).

## Connect Claude to the MCP endpoint
- **Claude Code:** one command — `claude mcp add --transport http trip-budget http://localhost:80/mcp`
  (use whichever port responded). New MCP servers load at session start, so launch a fresh `claude` in
  this folder; `getNightlyRate` / `estimateTotal` then appear as native tools you can just ask for.
- **Claude Desktop:** merge `claude_desktop_config.json` into your config (Claude > Settings > Developer > Edit Config), then restart. Claude Desktop is stdio-only, so it bridges to the HTTP endpoint via `mcp-remote`.

## Ask Claude to call your methods
- "What's the nightly rate in Tokyo?" → `TripBudget.getNightlyRate("tokyo")` → **140**
- "Estimate a 5-night trip to Lisbon for 2 travelers." → `TripBudget.estimateTotal("lisbon", 5, 2)` → **1225**
  (95 × 5 = 475 lodging + 75 × 5 × 2 = 750 spending = 1225)

## Cleanup
```bash
docker rm -f graftcode_tripbudget_mcp
```

## Why this matters
- The module has **nothing MCP-specific** — same business logic you'd write anyway.
- The private `NIGHTLY_RATES` table is **not** exposed — only the two public methods become tools.
- The integration with the AI tool is **just a URL**.
- One source of truth: your app and AI both call the same code — no parallel API for agents.

> Local `:81/mcp` is the no-account dev path. For a **stable** MCP URL + access control, run the gateway
> with a free Project Key from portal.graftcode.com.
