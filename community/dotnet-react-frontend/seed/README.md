# seed/ — try the with-vs-without experiment yourself

The point of Graftcode's AI rules is that **the same prompt produces a completely different result**.
This folder is the starting point for running that comparison honestly.

## The setup

Give your AI assistant a backend that **already exists** and ask it only to *connect* the frontend:

> "Here's my C# `TripBudget` class in `backend/`. Wire it up so my React app can call `EstimateTotal`
> and show the estimated trip cost."

The prompt never says "API", "REST", or "Graftcode". Run it twice — once without the rules, once with.

**Why the class must already exist:** if the AI writes the backend too, the two runs differ in
business logic *and* plumbing, and comparing them proves nothing. With the class fixed, every file
that differs between the runs is pure transport plumbing. That's the whole point.

## Why these files are separate from `../`

`../TripBudget.cs` and `../TripBudgetService.csproj` are the **finished** demo files, and their
comments explain the Graftcode contract ("hosted by the Graftcode Gateway", "drives the graft package
name", …). Handing those to an assistant gives away the answer — it infers Graftcode and never writes
the REST version.

These seed copies are the same **logic** with neutral comments. Verify before you start:

```bash
grep -ri "graft\|gateway" seed/       # must return nothing
```

## What is deliberately NOT here

| Absent | Why |
|---|---|
| `Dockerfile` | It runs `gg` — the biggest tell. With the rules, the assistant writes it for you. |
| `App.jsx` | The finished React consumer — also the answer. |

## Run it

```bash
mkdir -p ~/try/without && cd ~/try/without
npm create vite@latest . -- --template react && npm install
mkdir backend && cp /path/to/dotnet-react-frontend/seed/{TripBudget.cs,TripBudgetService.csproj} backend/
git init && git add -A && git commit -m "react app + backend class"
```

Ask the prompt above, then `git status` to count what the assistant added.

Now copy the folder, add **`CLAUDE.md` + `.claude/`** from
[grft-dev/graftcode-demos/rules/Claude](https://github.com/grft-dev/graftcode-demos/tree/main/rules/Claude),
reset with `git checkout . && git clean -fd`, and ask the **identical** prompt.

## What to expect

| | Without the rules | With the rules |
|---|---|---|
| `TripBudget.cs` | untouched, but wrapped in an envelope | untouched, and directly exposed |
| Files added | ~4–6: Web API project, controller, request/response DTOs, CORS, `fetch` client | 2: a `Dockerfile` that hosts it with `gg`, and `App.jsx` |
| Install command | n/a (hand-written client) | copied from the gateway's `/npm` route, never guessed |

The class's public method **was already the contract**. The rules just teach the assistant to see it
that way.
