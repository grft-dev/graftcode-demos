# seed/ — try the with-vs-without experiment yourself

Same idea as [`../../dotnet-react-frontend/seed/`](../../dotnet-react-frontend/seed/), for the MCP side.

## The setup

Give your AI assistant a module that **already exists** and ask it only to expose it:

> "Here's my `TripBudget` module. Expose it so an AI agent can call these methods."

The prompt never says "MCP server", "tool schema", or "Graftcode". Run it twice — once without the
rules, once with. Because the module is the constant, every file that differs between the two runs is
pure boilerplate.

## Why these files are separate from `../`

`../index.js` line 1 says *"exposed as MCP tools by the Graftcode Gateway"*, and `../package.json`'s
description names it too. Either one hands the assistant the answer.

These seed copies keep the same logic and the same JSDoc types, with neutral comments:

```bash
grep -ri "graft\|gateway\|mcp" seed/     # must return nothing
```

**Keep the JSDoc.** `@param {string}` / `@returns {number}` are ordinary JS practice — no Graftcode
signal — and they matter: plain JavaScript has no type annotations, so without them the analyzer infers
`object` for every parameter and the typed (npm) Graft can't be generated. MCP tool-calling works
either way, but stripping them costs you the typed package.

## What is deliberately NOT here

| Absent | Why |
|---|---|
| `Dockerfile` | It runs `gg`. With the rules, the assistant writes it for you. |
| `claude_desktop_config.json` | Points at the `/mcp` endpoint — also the answer. |

## Run it

```bash
mkdir -p ~/try/mcp-without && cd ~/try/mcp-without
cp /path/to/js-mcp-backend/seed/{index.js,package.json} .
git init && git add -A && git commit -m "module"
```

Ask the prompt above, then `git status` to count what the assistant added.

Now copy the folder, add **`CLAUDE.md` + `.claude/`** from
[grft-dev/graftcode-demos/rules/Claude](https://github.com/grft-dev/graftcode-demos/tree/main/rules/Claude),
reset with `git checkout . && git clean -fd`, and ask the **identical** prompt.

## What to expect

| | Without the rules | With the rules |
|---|---|---|
| `index.js` | untouched | untouched |
| Files added | an MCP server file, tool definitions, JSON schemas, handler wiring | 1: a `Dockerfile` that hosts it with `gg` |
| Tool schemas | hand-written, and drift the moment you change a signature | generated from the methods themselves |

The public methods **were already the tools**.
