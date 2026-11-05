# AI tokens for the same integration: REST and Graftcode

How many tokens does an AI coding agent spend connecting a C# backend to a React page? This folder lets you check for yourself.

The starter project has 20 public C# methods (pricing, billing, meters, tariffs, outages, loyalty) and an empty React page. The agent gets one prompt and one project rule. It must leave the business logic unchanged and show every method's result on the page:

> Leave every existing C# business logic file unchanged. Using {TECH}, integrate every public method so the page shows each result. Follow the project rules. Do not run any commands, installs, or builds. Only write files.

| | REST | Graftcode |
| --- | --- | --- |
| Project rule | [`rules/rest`](rules/rest/.cursor/rules/rest.mdc): each method has its own request type and response type, one C# type per file, plus a typed `fetch` client | [`rules/graftcode`](rules/graftcode/.cursor/rules/graftcode.mdc): call the generated client. JavaScript names are the C# names with a lowercase first letter. No method list |
| Median total tokens | **164,133** | **87,114** |
| Median output tokens | 11,826 | 4,336 |
| Finished project | 52 files, 957 lines | 10 files, 329 lines |
| Where to read it | [`results/rest`](../../official/perf-lab/results/rest) | [`results/graftcode`](../../official/perf-lab/results/graftcode) |

Graftcode used **46.9% fewer total tokens** and 63.3% fewer output tokens. REST is the median of 8 runs and Graftcode is the median of 5, all with `composer-2.5` on 5 November 2026. Every run is in [`results/`](results), and [`report.html`](report.html) shows them. Both examples build and pass the same acceptance check (`accept.mjs`): every method is wired, and the backend compiles.

Both agents read the same C# files. Neither is given the method signatures. The file counts above are the whole finished project, including the shared 9-file starter. REST's rule asks for a request type and a response type per method, with one C# type per file. Graftcode's rule asks for one call per method, plus a Dockerfile. The generated Graftcode client is installed afterwards and is not part of the file count.

## Try it in Cursor

You need Node.js 20+, and Cursor.

```powershell
git clone https://github.com/grft-dev/graftcode-demos.git
cd graftcode-demos/experiments/ai-integration
node prepare.mjs graftcode ../../../try-graftcode
node prepare.mjs rest ../../../try-rest
```

`prepare.mjs` copies [`starter/`](starter) and that technology's rules into an empty folder, then prints the prompt. Open each folder in Cursor, start a new Agent chat, send the prompt, and compare the token usage the chat reports. Use the same model for both.

The rule files are short on purpose, so you can edit them to match your own team's standards and see how the numbers change.

## Measure it with the Cursor SDK

This runs the agent headless, checks each result, and records the usage the SDK reports. It bills your Cursor account. Sign in with the Cursor SDK, or set `CURSOR_API_KEY`.

```powershell
npm install
node run.mjs rest --runs 3
node run.mjs graftcode --runs 3
node compare.mjs --from .scratch
node report.mjs --from .scratch
```

`--model <id>` picks another model. Runs are written to `.scratch/` (ignored by git), with each agent's files in a snapshot so you can see what it wrote. `node publish.mjs --from .scratch/<folder>` replaces `results/` with your runs.

## Run the Graftcode example

The agent only writes files, so the Graftcode client package is installed afterwards with one command. You need the .NET 8 SDK and Docker.

```powershell
cd ../../official/perf-lab/results/graftcode
node ../../../experiments/ai-integration/tools/graft-setup.mjs
```

`tools/graft-setup.mjs` builds `backend/`, runs the Graftcode Gateway with `--graftOnly` (it publishes the client and exits without starting a server), sets the `@graft` registry in `.npmrc`, installs the package, and prints the import line and every method signature. The gateway comes from `GG_PATH`, then `PATH`, then a cached download of release v1.4.14 from [grft-dev/graftcode-gateway](https://github.com/grft-dev/graftcode-gateway). That command is for running the finished example. The agent does not see its output.

Then start the backend and the page:

```powershell
docker build -t energy-graft backend
docker run --rm -p 80:80 energy-graft
npm install
npx vite
```

The REST example runs with `dotnet run --project backend` and `npx vite`.

## What we learned

- **Keep commands out of the agent loop.** When the Graftcode agent built Docker images, started the gateway, and read the generated package itself, it used several times more tokens than REST: every tool call re-sends the conversation. The agent now only writes files. `graft-setup.mjs` installs the client afterwards, for a person who wants to run the example.
- **No prepared method list.** An earlier Graftcode run was handed every signature in a file and told not to read the C# sources. That was removed. The agent reads the same C# the REST agent reads.
- **The saving comes from integration code.** When the REST rule leaves the file layout open, the totals meet: REST's median was 82,923 against Graftcode's 86,759. Asking for a request type and a response type per method, one C# type per file, is what the published comparison uses.
- **Both batches count.** Before the Graftcode rule named the real image tag `graftcode/netcore:10.0` and the Vite `esnext` target, two batches of that older wording had medians of 86,759 (3 runs) and 59,424 (5 runs). Together those 8 runs have a median of 72,314. The page uses the 5 runs of the current rule, whose median is 87,114, not the lower of those two batches.
- **Large UI work dilutes it.** When the prompt also asked for forms for every method, UI code dominated and the difference disappeared.

## Files

| Path | What it is |
| --- | --- |
| `starter/` | The project both agents start from |
| `prompt.txt`, `methods.json` | The prompt, and the methods acceptance requires |
| `rules/` | The project rule for each technology |
| [`official/perf-lab/results`](../../official/perf-lab/results) | The median run's finished project for each technology |
| `prepare.mjs` | Prepare a folder for a manual Cursor chat |
| `run.mjs`, `accept.mjs` | Run the agent with the SDK, and check the result |
| `compare.mjs`, `report.mjs`, `publish.mjs` | Summarize, write `report.html`, publish runs |
| `export-page.mjs` | Write the numbers the perf-lab page shows (`--check` verifies them) |
| `tools/graft-setup.mjs` | One-command Graftcode client setup |
