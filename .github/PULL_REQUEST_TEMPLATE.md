## What does this PR add/change?

<!-- One or two sentences. If this adds a new demo, name it and its type (Internal / Community). -->

## Minimum validation checklist

- [ ] Folder name is lowercase kebab-case and matches the [naming convention](../docs/FOLDER_STRUCTURE.md#folder-naming-convention)
- [ ] `README.md` is present, uses the matching [template](../docs/templates/), and states **Type** + **Owner**
- [ ] No secrets/API keys/tokens committed — `.env.example` used instead of `.env`
- [ ] No build artifacts or dependency folders committed (`node_modules/`, `venv/`, `bin/`, `obj/`, …) — covered by `.gitignore`
- [ ] `Dockerfile` (if present) builds successfully locally
- [ ] Root [README.md](../README.md) demo index updated with a link + one-line description
- [ ] `.github/CODEOWNERS` updated with an entry for the new folder
- [ ] Branch name follows `features/<slug>`, `fix/<slug>`, or `docs/<slug>`

### Community Demo (external contribution) only
- [ ] I confirm this code is my own or otherwise appropriately licensed for inclusion here
- [ ] Changes are self-contained to this demo's folder (plus root README/CODEOWNERS)

### Internal Demo only
- [ ] Multi-service demos include a `docker-compose.yml` or equivalent one-command bring-up
- [ ] Any cloud provisioning is documented in a root-level `*-DEPLOY.md`
- [ ] Tests (if present) pass locally
