# Repository & folder structure

This repo hosts two kinds of demos side by side, because they're contributed and maintained
differently:

| Type | Who usually contributes it | What it optimizes for |
|------|-----------------------------|------------------------|
| **Internal Demo** | Graftcode team | A realistic multi-service system, deployable, benchmarked |
| **Community Demo** | External contributors, quick-start authors | One clear integration story, fast to read, fast to run |

Both types live as **top-level folders** and both follow the same naming rule and the same
minimum README contract (see [CONTRIBUTING.md](../CONTRIBUTING.md)). Everything *inside* the
folder is where the two diverge — a Community Demo contributor is free to lay out their demo
however best tells the story; Internal Demos follow the fuller convention below.

## Top-level layout

```
graftcode-demos/
├── README.md              # repo overview + demo index (keep in sync when adding a demo)
├── CONTRIBUTING.md         # naming, README, ownership, and validation rules
├── docs/
│   ├── FOLDER_STRUCTURE.md # this file
│   └── templates/          # copy one of these when starting a new demo README
│       ├── README-community-demo.md
│       └── README-internal-demo.md
├── .github/
│   ├── CODEOWNERS          # who owns/reviews each top-level folder
│   └── PULL_REQUEST_TEMPLATE.md
├── rules/                  # shared, cross-cutting — internal-owned
├── <demo-folder>/          # Internal Demo or Community Demo, one per demo (see below)
└── <demo-folder>/
```

## Folder naming convention

- Lowercase **kebab-case** only: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- 2–5 hyphen-separated words, 3–40 characters
- Name the **stack/language + what it demonstrates**, not a person, ticket, or internal codename
- No `demo-` / `sample-` prefix — the whole repo is demos, the prefix adds nothing

| Good | Why |
|------|-----|
| `dotnet-react-frontend` | stack (.NET) + integration (React frontend) |
| `js-mcp-backend` | stack (JS) + pattern (MCP-exposed backend) |
| `grpc-energy-price-dotnet` | protocol + domain + stack |
| `sdn-currency-converter` | org/domain prefix + purpose |

| Avoid | Why |
|-------|-----|
| `Demo1`, `MyTest` | not descriptive, wrong case |
| `dotnet_react_frontend` | underscores instead of hyphens |
| `mehul-trip-budget-demo` | names the person, not the tech/pattern |

## Community Demo (external-friendly)

One folder, one integration story. Minimum required contents:

```
<demo-folder>/
├── README.md          # required — use docs/templates/README-community-demo.md
├── <source files>      # flat is fine — no mandated subfolder layout
├── Dockerfile          # if the demo is meant to be run/hosted
└── seed/               # optional — "before AI rules" version for side-by-side comparison
```

There is no requirement to nest source under `src/`, add tests, or add CI — the point of this
type is a fast, readable, runnable example. See `dotnet-react-frontend/`, `js-mcp-backend/`, and
`py-ai-backend/` for the existing pattern.

## Internal Demo (full / reference system)

Larger, often multi-service. Minimum required contents:

```
<demo-folder>/                 # or several sibling top-level folders that form one system,
├── README.md                  # e.g. perf-lab/ + electric-company-ws/ + grpc-energy-price-dotnet/
├── src/ (or per-service folders)
├── Dockerfile
├── docker-compose.yml          # if the demo spans more than one service
└── <deploy-name>-DEPLOY.md     # at repo root if it provisions cloud infra (see AZURE-DEPLOY.md)
```

If an Internal Demo is genuinely one cohesive system split across multiple top-level folders (as
`perf-lab` + `electric-company-ws` + `grpc-energy-price-dotnet` are today), that's fine — just
make sure the root [README.md](../README.md) "Repo layout" table explains how the folders relate.

## Declaring type + owner

Every demo README must state its type and owner near the top (see the templates). This is the
one piece of metadata both types share, and it's what [CONTRIBUTING.md](../CONTRIBUTING.md) and
`.github/CODEOWNERS` are built around:

```markdown
> **Type:** Community Demo · **Owner:** @nomadicmehul
```
