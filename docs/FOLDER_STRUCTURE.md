# Repository & folder structure

This repo hosts two kinds of demos, physically separated because they're contributed and
maintained differently:

| Type | Lives under | Who usually contributes it | What it optimizes for |
|------|-------------|------------------------------|------------------------|
| **Official Demo** | `official/` | Graftcode team | A realistic multi-service system, deployable, benchmarked |
| **Community Demo** | `community/` | External contributors, quick-start authors | One clear integration story, fast to read, fast to run |

Both types follow the same naming rule and the same minimum README contract (see
[CONTRIBUTING.md](../CONTRIBUTING.md)). Everything *inside* a demo's own folder is where the two
diverge — a Community Demo contributor is free to lay out their demo however best tells the
story; Official Demos follow the fuller convention below.

`rules/` sits outside both — it's shared, cross-cutting tooling that either type can reference,
not a demo in its own right, so it isn't classified as Official or Community.

## Top-level layout

```
graftcode-demos/
├── README.md              # repo overview + demo index (keep in sync when adding a demo)
├── CONTRIBUTING.md         # naming, README, ownership, and validation rules
├── docs/
│   ├── FOLDER_STRUCTURE.md # this file
│   └── templates/          # copy one of these when starting a new demo README
│       ├── README-community-demo.md
│       └── README-official-demo.md
├── .github/
│   ├── CODEOWNERS          # who owns/reviews community/ vs official/
│   └── PULL_REQUEST_TEMPLATE.md
├── rules/                  # shared, cross-cutting — usable by either type, not itself a demo
├── community/
│   └── <demo-folder>/      # Community Demo, one per demo
└── official/
    └── <demo-folder>/      # Official Demo, one per demo
```

## Folder naming convention

- Lowercase **kebab-case** only: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- 2–5 hyphen-separated words, 3–40 characters
- Name the **stack/language + what it demonstrates**, not a person, ticket, or internal codename
- No `demo-` / `sample-` prefix — the whole repo is demos, the prefix adds nothing
- This applies to the demo's own leaf folder name — the `community/`/`official/` parent already
  says what type it is, so don't also encode that in the name

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
| `official-perf-lab` | redundant — `official/` already says the type |

## Community Demo (`community/`, external-friendly)

One folder, one integration story. Minimum required contents:

```
community/<demo-folder>/
├── README.md          # required — use docs/templates/README-community-demo.md
├── <source files>      # flat is fine — no mandated subfolder layout
├── Dockerfile          # if the demo is meant to be run/hosted
└── seed/               # optional — "before AI rules" version for side-by-side comparison
```

There is no requirement to nest source under `src/`, add tests, or add CI — the point of this
type is a fast, readable, runnable example. See `community/dotnet-react-frontend/`,
`community/js-mcp-backend/`, and `community/py-ai-backend/` for the existing pattern.

## Official Demo (`official/`, full / reference system)

Larger, often multi-service. Minimum required contents:

```
official/<demo-folder>/        # or several sibling folders under official/ that form one system,
├── README.md                  # e.g. official/perf-lab/ + official/electric-company-ws/ +
├── src/ (or per-service folders)  #   official/grpc-energy-price-dotnet/
├── Dockerfile
├── docker-compose.yml          # if the demo spans more than one service
└── <deploy-name>-DEPLOY.md     # at repo root if it provisions cloud infra (see AZURE-DEPLOY.md)
```

If an Official Demo is genuinely one cohesive system split across multiple folders (as
`official/perf-lab` + `official/electric-company-ws` + `official/grpc-energy-price-dotnet` are
today), that's fine — just make sure the root [README.md](../README.md) "Repo layout" section
explains how the folders relate.

## Declaring the owner

Every demo README must state its owner near the top (see the templates). The demo's *type* is no
longer restated here — `community/` or `official/` already says that. This owner line is what
[CONTRIBUTING.md](../CONTRIBUTING.md) and `.github/CODEOWNERS` are built around:

```markdown
> **Owner:** @nomadicmehul
```
