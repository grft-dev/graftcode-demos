# Contributing to graftcode-demos

This repo takes contributions from two kinds of people, and treats them differently on purpose:

- **Internal Graftcode team members**, building out full reference demos and benchmarks.
- **External contributors**, adding a focused, single-integration demo (e.g.
  `dotnet-react-frontend`, `js-mcp-backend`, `py-ai-backend`).

Both are welcome, and both follow the same naming rule and the same minimum README contract —
but they live in physically separate parent folders, and a Community Demo is free to structure
its *own* internals however best tells its story, while an Official Demo follows the fuller
convention below. See [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) for the details and
rationale.

## Before you start

1. Decide your demo type:
   - **Community Demo**: one clear integration story, runnable in a few steps. This is the type
     for most external contributions. Lives under `community/`.
   - **Official Demo**: a realistic, possibly multi-service system. Internal by default; external
     contributors proposing one of these should open an issue first to align on scope. Lives
     under `official/`.
2. Pick a folder name that follows the [naming convention](docs/FOLDER_STRUCTURE.md#folder-naming-convention)
   — lowercase kebab-case, describes stack + purpose, e.g. `py-ai-backend`, not `my-demo`.
3. Copy the matching template into `<community|official>/<your-folder>/README.md`:
   - Community Demo → [docs/templates/README-community-demo.md](docs/templates/README-community-demo.md)
   - Official Demo → [docs/templates/README-official-demo.md](docs/templates/README-official-demo.md)

## Folder structure at a glance

```
graftcode-demos/
├── README.md              # repo overview + demo index — update this when adding a demo
├── CONTRIBUTING.md         # this file
├── docs/
│   ├── FOLDER_STRUCTURE.md
│   └── templates/
├── .github/
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
├── rules/                  # shared, cross-cutting, usable by either type — not itself a demo
├── community/
│   ├── dotnet-react-frontend/
│   ├── js-mcp-backend/
│   └── py-ai-backend/
└── official/
    ├── perf-lab/
    ├── electric-company-*/
    └── ...
```

Full details, including what's mandatory inside a Community Demo vs an Official Demo, live in
[docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md).

## README requirements

Every demo's `README.md` must include, near the top:

```markdown
> **Owner:** @<github-handle>
```

That's it for required metadata — the demo's *type* is no longer restated in the README, because
its parent folder (`community/` or `official/`) already says so unambiguously. This one line is
what ties the README to `.github/CODEOWNERS` and to how the demo gets reviewed.

Beyond that, use the matching template as a starting point — it's deliberately short for a
Community Demo (prerequisites, steps, why it matters, gotchas) and covers more ground for an
Official Demo (layout, run-locally, deploy, tech stack). Don't feel obligated to fill in a
section that doesn't apply; do feel obligated to keep the Owner line and a working "how do I run
this" section.

## Ownership

- `.github/CODEOWNERS` maps `community/` and `official/` to their default owners (an individual
  for Community Demos, the internal team for Official Demos). GitHub uses this to auto-request
  review on a PR that touches that folder. A specific demo can override the default by adding a
  more specific line below the wildcard entries (CODEOWNERS uses last-match-wins).
- Adding a new demo with a different owner than its bucket's default means adding a line to
  `.github/CODEOWNERS` for it, in the same PR.
- You own what you contribute: as the listed owner, you're the first responder to issues and
  review requests against that folder. Ownership doesn't block others from proposing changes —
  CODEOWNERS drives *review routing*, not write access.

## Naming conventions

See [docs/FOLDER_STRUCTURE.md#folder-naming-convention](docs/FOLDER_STRUCTURE.md#folder-naming-convention).
Short version: lowercase kebab-case, name the stack + what it demonstrates
(`dotnet-react-frontend`), never a person or internal codename. The naming rule applies to the
demo's own folder name — the `community/`/`official/` parent is what encodes its type.

## Branching & commits

- Branch names: `features/<slug>` for a new demo or feature, `fix/<slug>` for a bug fix,
  `docs/<slug>` for documentation-only changes.
- Keep a PR scoped to one demo (or one fix). Don't bundle an unrelated folder's changes in.
- External contributors: fork the repo, branch as above, and open a PR against `main`.

## Minimum validation requirements

A PR must satisfy all of these before merge — they're also captured in
[.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) as a checklist:

- [ ] Demo folder is placed under `community/` or `official/`, matching its type
- [ ] Folder name matches the naming convention
- [ ] `README.md` present, using the right template, with **Owner** stated
- [ ] No secrets/credentials committed (`.env.example`, not `.env`)
- [ ] No committed build artifacts or dependency folders (`node_modules/`, `venv/`, `bin/`,
      `obj/`, …) — add them to `.gitignore` if missing
- [ ] Any `Dockerfile` builds successfully
- [ ] Root `README.md` demo index updated to link the new demo
- [ ] `.github/CODEOWNERS` updated if the demo's owner differs from its bucket's default
- [ ] Branch name follows the convention above

Community Demo adds:
- [ ] Contributor confirms the code is original or appropriately licensed for inclusion
- [ ] Changes are self-contained to the demo's own folder (plus root README/CODEOWNERS)

Official Demo adds:
- [ ] Multi-service demos ship a `docker-compose.yml` (or equivalent one-command bring-up)
- [ ] Cloud provisioning is documented in a root-level `*-DEPLOY.md` (see `AZURE-DEPLOY.md`)
- [ ] Any tests pass locally

## Questions

Open an issue, or tag the folder's owner from `.github/CODEOWNERS` directly on your PR.
