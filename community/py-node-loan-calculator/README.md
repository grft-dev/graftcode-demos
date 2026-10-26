# Node storefront calling a Python backend (Python → Node)

**A Python `LoanCalculator.monthly_payment(...)` method, hosted with `gg`, called directly from a
Node/Express product page. No FastAPI wrapper, no OpenAPI spec, no generated client, and no
re-implementing the amortization formula in JavaScript.**

> **Owner:** @nomadicmehul

## The story
A finance team owns the loan-payment formula in Python. A storefront team, in Node, wants to show a
financing line under a product's price. Normally that's a service boundary: an API, a client, and two
teams keeping a contract in sync by hand. Here, the Python method **is** the contract.

- `LoanCalculator.monthly_payment(1200, 9.9, 12)` → **105.44** — a €1,200 laptop, 9.9% APR, 12 months.

```
py-node-loan-calculator/
├── loan_calculator.py   # the Python service — the only place the formula lives
├── pyproject.toml       # marks the module folder as Python for gg's auto-detection
├── Dockerfile           # python:3.13 + gg, hosts the module on :80 / :81
└── storefront/          # Node/Express page that calls the Python method as a typed Graft
    ├── package.json
    └── server.js
```

## Prerequisites
- Docker (running)
- Node.js
- No local Python required — the container ships it.

## Steps / Run it

```bash
cd community/py-node-loan-calculator

# 1. Host the Python service
docker build --no-cache --pull -t loan-calculator-py:test .
docker run -d -p 80:80 -p 81:81 --name graftcode_loan_calculator loan-calculator-py:test

# 2. Wait for readiness + grab the exact install command (don't scrape docker logs)
curl -sS --max-time 5 http://localhost:80/npm
# → npm install --registry https://grft.dev/<GUID>__free @graft/pypi-loan-service@1.0.0

# 3. Wire up the Node storefront
cd storefront
npm install
# paste the exact command from step 2:
npm install --no-fund --no-audit --registry https://grft.dev/<GUID>__free @graft/pypi-loan-service@1.0.0
npm start
# → http://localhost:3000 shows: Laptop Pro 14, €1200, from €105.44/month (12 months, 9.9% APR)
```

Sanity-check the contract before wiring anything:
```bash
curl -sS http://localhost:80/libraries -o ugm.json
grep -o '"LoanCalculator"\|"monthly_payment"' ugm.json
```

### Runtime auto-detection & `--runtime`

The Dockerfile's `CMD` never passes `--runtime` — it's just `gg --modules ./loan-service/`. Confirm
`gg` figured out on its own that this is Python:
```bash
docker logs graftcode_loan_calculator | grep -i "runtime"
# [Info] Hosted runtime: auto
# [Info] Launching runtime: python
```
`Hosted runtime: auto` is the flag value (unset). `Launching runtime: python` is `gg` reading the
module directory (`loan_calculator.py` + `pyproject.toml`) and picking the runtime itself.

To be explicit instead, pass the flag yourself — same result:
```bash
docker run -d -p 80:80 -p 81:81 --name graftcode_loan_calculator loan-calculator-py:test \
  gg --modules ./loan-service/ --runtime python
# [Info] Hosted runtime: python
# [Info] Launching runtime: python
```

## Why this matters
- Two languages, one method, zero hand-written glue: no REST controller in Python, no `fetch` client
  in Node, no shared OpenAPI spec to keep in sync.
- The amortization math lives in **exactly one place** — the Python file. The storefront doesn't
  reimplement it, guess at it, or call an external calculator API.
- The `.d.ts` that ships with the installed package is the real contract — parameter names, casing,
  and all.

## Gotchas / Cleanup
- **Python is `snake_case`, the generated JS client is `camelCase`.** The Python method is
  `monthly_payment`; in Node you call `LoanCalculator.monthlyPayment(...)`. Calling the Python
  spelling fails with `LoanCalculator.monthly_payment is not a function`. Read the method name from
  the installed package's `.d.ts` (or from `/libraries`) rather than assuming it carries over.
- **Why Docker for a Python host?** `gg` bundles the Node runtime, but for Python it has to find and
  embed an interpreter already on the machine. Detection works everywhere, but loading the interpreter
  depends on how Python was installed — e.g. a Homebrew Python on macOS can fail with
  `Python Launcher: Exception code 006. Cannot find Python installed on this machine.` The container
  ships a known-good Python, so `gg` finds it the same way on any host.
- Local `ws://localhost/ws` is the no-account dev path. For a stable host across restarts, run the
  gateway with a free Project Key from [portal.graftcode.com](https://portal.graftcode.com). The
  storefront reads `GRAFT_HOST` if you need to point it elsewhere.
- Cleanup:
  ```bash
  docker rm -f graftcode_loan_calculator
  ```
