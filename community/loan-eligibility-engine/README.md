# 🏦 Loan Eligibility Engine — Graftcode Gateway Demo

> **Demonstrates how Graftcode Gateway exposes a plain Java class as a remotely callable service — no Spring Boot, no REST controllers, no HTTP framework of any kind.**

> **Owner:** @Akshat111111

---

## Table of Contents

1. [Overview](#overview)
2. [Exposed API](#exposed-api)
3. [Why No HTTP Framework Is Required](#why-no-http-framework-is-required)
4. [Project Structure](#project-structure)
5. [Architecture](#architecture)
6. [Prerequisites](#prerequisites)
7. [Build & Run](#build--run)
8. [Running Tests](#running-tests)
9. [Graftcode Vision](#graftcode-vision)
10. [Verification — Live Smoke Check](#verification--live-smoke-check)
11. [Client Installation (Grafts)](#client-installation-grafts)
12. [Business Rules Reference](#business-rules-reference)
13. [Known Gotcha — Fat JAR Exposes Too Many Methods](#known-gotcha--fat-jar-exposes-too-many-methods)
14. [Technology Stack](#technology-stack)

---

## Overview

This project implements a **Loan Eligibility Engine** in plain Java — a single class with three
public methods: credit-score validation, debt-to-income ratio calculation, and a full application
evaluation against four rules (income, credit score, working history, and that ratio). It reports
either a decline reason or an eligibility verdict with a projected risk severity.

The engine is a plain Java class with zero framework dependencies. [Graftcode
Gateway](https://docs.graftcode.com) discovers and exposes all public methods automatically via
reflection, making them callable from any language.

### Evaluation order

`evaluateLoan` checks the application in this exact order and returns the first failure:

1. `annualIncome < $20,000` → `NOT ELIGIBLE - annual income $... is below the minimum of $20000.00.`
2. `creditScore < 600` → `NOT ELIGIBLE - credit score ... is below the minimum of 600.`
3. `workingYears < 1` → `NOT ELIGIBLE - ... working year(s) is below the minimum of 1.`
4. `DTI = preExistingDebt / annualIncome > 43%` → `NOT ELIGIBLE - debt-to-income ratio ...% exceeds the maximum of 43%.`
5. otherwise → `ELIGIBLE - risk <LEVEL> (debt-to-income ratio <x>%). <severity projection>`

Note that DTI is computed from **annual** pre-existing debt over **annual** income, and that
`applicantName` is display-only — it never affects the decision.

---

## Exposed API

One class, three public methods — that is the entire remote surface:

| # | Method | Signature | Returns |
|---|--------|-----------|---------|
| 1 | Loan eligibility evaluation | `evaluateLoan(String applicantName, double annualIncome, int workingYears, double preExistingDebt, int creditScore)` | decision text |
| 2 | Credit score validation | `validateCreditScore(int creditScore)` | `ELIGIBLE - ...` / `NOT ELIGIBLE - ...` |
| 3 | Debt-to-income ratio calculation | `calculateDebtToIncomeRatio(double annualIncome, double preExistingDebt)` | `double` (`0.43` = 43%) |

All three live in `com.graftcode.demo.loan.LoanEligibilityEngine`, which has only the implicit
no-arg constructor. The rule checks (`incomeProblem`, `creditScoreProblem`, `workingYearsProblem`)
and the risk projection (`projectRiskLevel`, `projectSeverityOfRisk`) are `private static`, so they
are never exposed — that is what keeps the surface at exactly three methods. The income and
working-history rules still apply inside `evaluateLoan`; they just have no separate public method.

Because every parameter is a scalar and the returns are strings or a `double`, Vision renders
plain input boxes. There are no request/response model objects: the earlier `LoanApplication`,
`EligibilityResult`, and `RiskLevel` classes have been removed.

---

## Why No HTTP Framework Is Required

Traditional approach requires hundreds of lines of boilerplate:

```java
// ❌ Old way (Spring Boot)
@RestController
@RequestMapping("/api/loans")
public class LoanController {
    @PostMapping("/evaluate")
    public ResponseEntity<String> evaluate(@RequestBody LoanRequest request) { ... }
    // + Service layer, Repository, OpenAPI config, Exception handlers,
    // + Security config, Serialization config, Health endpoints...
}
```

With Graftcode Gateway — just write your business logic:

```java
// ✅ New way — zero boilerplate
public class LoanEligibilityEngine {
    public String evaluateLoan(String applicantName, double annualIncome, int workingYears,
                               double preExistingDebt, int creditScore) {
        // Pure business logic — Graftcode handles transport, discovery,
        // serialization, and client generation automatically
    }
}
```

**How Graftcode Gateway does this:**
1. Reads the compiled JAR (`gg --modules <jar>`)
2. Uses Java reflection to discover all `public` classes and methods
3. Exposes them on **port 80** as an RPC service
4. Serves the **Graftcode Vision** browser UI and its WebSocket backend on **port 80** as well,
   with a live tester and package-manager commands to generate strongly-typed clients in Java,
   Python, Node.js, .NET, and more

---

## Project Structure

```
loan-eligibility-engine/
├── pom.xml                                          Maven build config (thin JAR)
├── Dockerfile                                       Builds image + installs Graftcode Gateway
├── Dockerfile.test                                  Runs the JUnit suite only (no gateway)
├── .dockerignore                                    Keeps the host's target/ out of the image
├── docker-compose.yml                               Runs gateway on mapped ports 8080 & 8081
├── README.md                                        This file
├── architecture.md                                  High-level architecture diagrams
│
├── src/
│   ├── main/java/com/graftcode/demo/loan/
│   │   └── LoanEligibilityEngine.java               ← The only class (3 public methods)
│   │
│   └── test/java/com/graftcode/demo/loan/
│       └── LoanEligibilityEngineTest.java           Test suite (23 cases)
│
└── examples/
    ├── requests/                                    evaluateLoan inputs (5 scalar fields)
    │   ├── valid_application_low_risk.json
    │   ├── valid_application_medium_risk.json
    │   ├── valid_application_high_risk.json
    │   ├── declined_insufficient_income.json
    │   ├── declined_insufficient_credit_score.json
    │   ├── declined_insufficient_working_years.json
    │   └── declined_high_dti.json
    └── responses/                                   The exact strings the engine returns
        ├── approved_low_risk.json
        ├── approved_medium_risk.json
        ├── approved_high_risk.json
        ├── declined_insufficient_income.json
        ├── declined_insufficient_credit_score.json
        ├── declined_insufficient_working_years.json
        └── declined_high_dti.json
```

> **Note:** each request file is the five scalar `evaluateLoan` arguments (`applicantName`,
> `annualIncome`, `workingYears`, `preExistingDebt`, `creditScore`), and each response file is the
> bare string the method returns — `evaluateLoan` no longer has a result object.

---

## Architecture

See [architecture.md](./architecture.md) for full ASCII diagrams and the evaluation flow.

High-level:
```
Client App (any language)
    │  Strongly-typed Graft client
    ▼
Graftcode Gateway (Docker)
    │  Port 80: RPC calls + Vision UI/WebSocket
    │  Java reflection
    ▼
LoanEligibilityEngine (plain Java — one class)
    ├── 3 public methods                      ← exposed
    └── private rule checks + risk projection ← hidden
```

---

## Prerequisites

### For Docker (recommended)
- [Docker](https://docs.docker.com/get-docker/) installed and running — that's it!
  The Docker image includes Maven and JDK 21.

### For local development (without Docker)
- [JDK 21](https://adoptium.net/) (Temurin or equivalent)
- [Maven 3.9+](https://maven.apache.org/download.cgi)

---

## Build & Run

### Build the JAR

```bash
mvn package
```

This produces a single thin JAR:

- `target/loan-eligibility-engine-1.0.0.jar` — project classes only, which is what
  `gg --modules` is pointed at

### Run with Docker Compose (recommended)

```bash
docker compose up --build -d
```

The container exposes:

| Host port | Container port | Purpose |
|-----------|----------------|---------|
| 8080 | 80 | RPC endpoint **and** Graftcode Vision UI + WebSocket |
| 8081 | 81 | Secondary port — serves the Vision page but **not** the WebSocket backend |

### Or with plain Docker commands

```bash
# Build the image
docker build -t loan-eligibility-engine:1.0.0 .

# Run the container
docker run -d \
  -p 8080:80 \
  -p 8081:81 \
  --name graftcode_loan_engine \
  loan-eligibility-engine:1.0.0
```

> ⚠️ The upstream quick-start uses `-p 80:80 -p 81:81`. This project maps to 8080/8081 to avoid
> binding ports 80/81 on the host, which are often already in use.

### Stop and remove

```bash
docker compose down
# or
docker stop graftcode_loan_engine && docker rm graftcode_loan_engine
```

### View logs

```bash
docker logs graftcode_loan_engine -f
```

The gateway logs the generated client install commands (npm / NuGet / PyPI / Maven / RubyGems /
Packagist) on startup.

---

## Running Tests

```bash
mvn test
```

Expected output:
```
[INFO] Building Loan Eligibility Engine 1.0.0
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.089 s -- in com.graftcode.demo.loan.LoanEligibilityEngineTest
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Test Coverage

| Method | Cases | Scenarios |
|--------|-------|-----------|
| 1. `evaluateLoan` | 18 | **Risk bands (3)** — LOW / MEDIUM / HIGH. **Declines (4)** — DTI over the maximum, income below the minimum, credit score below the minimum, working history below the minimum. **Check order (2)** — income before credit score, credit score before working years. **Boundaries (9)** — 19.9% → LOW, 20% → MEDIUM, 35.9% → MEDIUM, 36% → HIGH, 43% → HIGH (accepted), 44% → declined, credit score 600 (accepted), income $20,000 (accepted), 1 working year (accepted). |
| 2. `validateCreditScore` | 2 | 600 → `ELIGIBLE`, 599 → `NOT ELIGIBLE` |
| 3. `calculateDebtToIncomeRatio` | 3 | $24k of $80k → `0.30`, no debt → `0.0`, income `0` → guarded to `0.0` |

**23 cases in total — every exposed method is covered, and `evaluateLoan` carries the full rule
matrix.** Every assertion compares the **complete**
returned string (or the ratio as a `double`), so the message wording and the formatted ratio are
covered too. The boundary cases pin the threshold semantics: LOW is exclusive at 20%, MEDIUM is
exclusive at 36%, and the 43% ratio maximum, the $20,000 income minimum, the 1 working year
minimum and the 600 credit-score minimum are all inclusive.

Tests also run inside the image build: the `Dockerfile` uses plain `mvn package -q`, exactly as
the official quick-start does.

To run the suite in isolation without starting the gateway:

```bash
docker build -f Dockerfile.test -t loan-engine-tests .
docker run --rm loan-engine-tests
```

---

## Graftcode Vision

Open **[http://localhost:8080/GV](http://localhost:8080/GV)** in your browser.

> **Important:** use port **8080**, not 8081. This `gg` build starts its WebSocket backend on
> port 80 (host-mapped to 8080) and announces it in the logs as
> `Graft Vision is available on http://localhost:80`. Port 81 serves the same Vision page HTML,
> but WebSocket connections there fail, so the UI loads and then shows nothing.

You will see the three methods listed in [Exposed API](#exposed-api), each with its parameter list
and return type, plus:

- A **"Try it out"** button to call methods live from the browser
- Package manager commands to install this service as a strongly-typed client

---

## Verification — Live Smoke Check

The engine is verified against the **deployed JAR inside the running container**, not just against
the sources.

> **Re-run after the refactor.** The tables below were reproduced against the deployed
> `loan-eligibility-engine-1.0.0.jar` inside the container — every row returned the expected value
> on the first run, and the same expectations are asserted by the 23-case suite.

### Transport

```
Container ports : 0.0.0.0:8080->80/tcp, 0.0.0.0:8081->81/tcp
Vision page     : http://localhost:8080/GV        -> 200
Vision page     : http://localhost:8081/GV        -> 200 (no WebSocket backend)
ws://localhost:8080/ws                            -> Open
ws://localhost:8081/ws                            -> connection fails
```

### Exposed API

Confirmed with `javap -classpath /usr/app/target/loan-eligibility-engine-1.0.0.jar`:

```
public class com.graftcode.demo.loan.LoanEligibilityEngine {
  public com.graftcode.demo.loan.LoanEligibilityEngine();
  public java.lang.String evaluateLoan(java.lang.String, double, int, double, int);
  public java.lang.String validateCreditScore(int);
  public double calculateDebtToIncomeRatio(double, double);
}
```

Exactly one class and the three intended methods — no model classes and no leftover helpers. The
thin JAR contains a single entry: `com/graftcode/demo/loan/LoanEligibilityEngine.class`.

### Method behaviour with values

**1. `evaluateLoan(applicantName, annualIncome, workingYears, preExistingDebt, creditScore)`** —
`applicantName` is display-only, so it is left out of the table:

| # | annualIncome | workingYears | preExistingDebt | creditScore | Expected result |
|---|--------------|--------------|-----------------|-------------|-----------------|
| 1 | 120,000 | 5 | 12,000 | 700 | `ELIGIBLE - risk LOW (debt-to-income ratio 10.0%). Minimal severity - risk is well within acceptable limits.` |
| 2 | 80,000 | 3 | 24,000 | 700 | `ELIGIBLE - risk MEDIUM (debt-to-income ratio 30.0%). Moderate severity - risk requires standard monitoring.` |
| 3 | 80,000 | 2 | 32,000 | 700 | `ELIGIBLE - risk HIGH (debt-to-income ratio 40.0%). Substantial severity - risk is near the acceptable limit.` |
| 4 | 80,000 | 4 | 40,000 | 700 | `NOT ELIGIBLE - debt-to-income ratio 50.0% exceeds the maximum of 43%.` |
| 5 | 15,000 | 4 | 1,000 | 700 | `NOT ELIGIBLE - annual income $15000.00 is below the minimum of $20000.00.` |
| 6 | 60,000 | 3 | 1,000 | 599 | `NOT ELIGIBLE - credit score 599 is below the minimum of 600.` |
| 7 | 60,000 | 0 | 1,000 | 700 | `NOT ELIGIBLE - 0 working year(s) is below the minimum of 1.` |
| 8 | 15,000 | 3 | 1,000 | 500 | `NOT ELIGIBLE - annual income $15000.00 is below the minimum of $20000.00.` — income is reported before the credit score |
| 9 | 60,000 | 0 | 1,000 | 500 | `NOT ELIGIBLE - credit score 500 is below the minimum of 600.` — credit score is reported before the working years |
| 10 | 100,000 | 3 | 43,000 | 700 | `ELIGIBLE - risk HIGH (debt-to-income ratio 43.0%). Substantial severity - risk is near the acceptable limit.` — maximum is inclusive |
| 11 | 100,000 | 3 | 44,000 | 700 | `NOT ELIGIBLE - debt-to-income ratio 44.0% exceeds the maximum of 43%.` |
| 12 | 100,000 | 3 | 19,900 | 700 | `ELIGIBLE - risk LOW (debt-to-income ratio 19.9%). Minimal severity - risk is well within acceptable limits.` |
| 13 | 100,000 | 3 | 20,000 | 700 | `ELIGIBLE - risk MEDIUM (debt-to-income ratio 20.0%). Moderate severity - risk requires standard monitoring.` |
| 14 | 100,000 | 3 | 35,900 | 700 | `ELIGIBLE - risk MEDIUM (debt-to-income ratio 35.9%). Moderate severity - risk requires standard monitoring.` |
| 15 | 100,000 | 3 | 36,000 | 700 | `ELIGIBLE - risk HIGH (debt-to-income ratio 36.0%). Substantial severity - risk is near the acceptable limit.` |
| 16 | 120,000 | 5 | 12,000 | 600 | `ELIGIBLE - risk LOW (debt-to-income ratio 10.0%). Minimal severity - risk is well within acceptable limits.` — credit-score minimum is inclusive |
| 17 | 20,000 | 3 | 1,000 | 700 | `ELIGIBLE - risk LOW (debt-to-income ratio 5.0%). Minimal severity - risk is well within acceptable limits.` — income minimum is inclusive |
| 18 | 60,000 | 1 | 1,000 | 700 | `ELIGIBLE - risk LOW (debt-to-income ratio 1.7%). Minimal severity - risk is well within acceptable limits.` — working-years minimum is inclusive |

**2. `validateCreditScore(creditScore)`**

| creditScore | Expected result |
|-------------|-----------------|
| 600 | `ELIGIBLE - credit score 600 meets the minimum of 600.` |
| 599 | `NOT ELIGIBLE - credit score 599 is below the minimum of 600.` |

**3. `calculateDebtToIncomeRatio(annualIncome, preExistingDebt)`**

| annualIncome | preExistingDebt | Expected result |
|--------------|-----------------|-----------------|
| 80000 | 24000 | `0.30` |
| 80000 | 0 | `0.0` |
| 0 | 5000 | `0.0` — guarded, so the ratio can never be `Infinity` or `NaN` |

Each `ELIGIBLE` result also carries the internal severity projection:

| Risk level | Projected severity |
|------------|--------------------|
| `LOW` | Minimal severity - risk is well within acceptable limits. |
| `MEDIUM` | Moderate severity - risk requires standard monitoring. |
| `HIGH` | Substantial severity - risk is near the acceptable limit. |

### Reproducing the check

Copy a driver into the running container, compile it against the deployed JAR, and run it:

```bash
docker cp Verify.java graftcode_loan_engine:/tmp/Verify.java
docker exec graftcode_loan_engine sh -c \
  "cd /tmp && javac -cp /usr/app/target/loan-eligibility-engine-1.0.0.jar -d /tmp/out Verify.java \
   && java -cp /usr/app/target/loan-eligibility-engine-1.0.0.jar:/tmp/out Verify"
```

The driver only needs:

```java
String result = new LoanEligibilityEngine()
        .evaluateLoan("Jane Smith", 120_000, 5, 12_000, 700);
System.out.println(result);
```

### Re-verification status (quick-start steps 5–6)

This project is re-verified against the quick-start flow after every change to the exposed API:

| Quick-start step | What is re-run | Status |
|------------------|----------------|--------|
| **5. Expose the service** | `gg --modules loan-eligibility-engine-1.0.0.jar` in the container; the discovered class and its methods listed with `javap` against the [Exposed API](#exposed-api) table | ✅ one class, three methods |
| **6. Call it from another app** | The deployed JAR invoked with the values above, plus the 23-case suite run during the image build | ✅ every row matched |

> **Note on step 6:** the re-verification calls the exact method the gateway invokes, by running
> the deployed JAR directly inside the container — no Graft client package was installed. The
> generated install command is per-run (its registry URL embeds a fresh token on every gateway
> start), so copy it from Vision or the Gateway logs when you want to exercise the full consumer
> path described in [Client Installation](#client-installation-grafts).

---

## Client Installation (Grafts)

> **Quick-start step 6 — Call it from another app.**
> Your service is now accessible from any application. From Graftcode Vision, select your target
> package type — for example npm — and copy the generated install command. That installs a
> **Graft**: a strongly-typed client that lets any app call your service methods directly.
>
> The generated npm package name comes from the Maven `groupId` / `artifactId` and can be long —
> for this sample it is
> `@graft/maven-groupid_com-graftcode-demo_artifactid_loan-eligibility-engine@1.0.0`. Always
> prefer the exact command from Vision or the Gateway logs.

From Graftcode Vision, pick your target package type and copy the install command. The generated
coordinates for this project are stable:

| Registry | Coordinates |
|----------|-------------|
| Maven | `graft.maven.com.graftcode.demo:loan-eligibility-engine:1.0.0` |
| npm | `@graft/maven-groupid_com-graftcode-demo_artifactid_loan-eligibility-engine@1.0.0` |
| PyPI | `graft-maven-groupid-com-graftcode-demo-artifactid-loan-eligibility-engine==1.0.0` |
| NuGet | `graft.maven.groupid_com.graftcode.demo_artifactid_loan-eligibility-engine` (1.0.0) |
| RubyGems | `graft-maven-groupid-com-graftcode-demo-artifactid-loan-eligibility-engine` (1.0.0) |
| Packagist | `graft-maven-com-graftcode-demo/loan-eligibility-engine:1.0.0` |

The registry URL (`https://grft.dev/...`) contains a per-run token — always copy the exact command
from Vision or the gateway startup logs rather than reusing a previous one.

Java client usage (the import follows the generated package-naming convention — use the exact one
shown by Vision for your install):

```java
import com.graft.maven.loaneligibilityengine.LoanEligibilityEngine;

var result = LoanEligibilityEngine.evaluateLoan("Jane Smith", 120_000, 5, 12_000, 700);
System.out.println(result);
```

No REST clients, no request/response models, no endpoint URLs in your code. When you add or update
a public method, consumers update their Graft with a single package manager command.

### With a Project Key (Production)

For real-world usage, create a free account at [portal.graftcode.com](https://portal.graftcode.com),
set up a project, and pass the key at startup:

**Option 1**: Modify the `Dockerfile` CMD:
```dockerfile
CMD ["gg", "--modules", \
     "/usr/app/target/loan-eligibility-engine-1.0.0.jar", \
     "--projectKey", "YOUR_PROJECT_KEY"]
```

**Option 2**: Use the environment variable (see the commented block in `docker-compose.yml`).

A Project Key gives you:
- **Stable registry URL** — consumers always find your service even after redeployment
- **Portal visibility** — manage all gateways at [gateways.graftcode.com](https://gateways.graftcode.com)
- **Access control** — authentication and permissions for client installs
- **MCP endpoint** — AI agent / LLM-callable interface out of the box

---

## Business Rules Reference

| Rule | Threshold | Decision |
|------|-----------|----------|
| Minimum annual income | `< $20,000` | **NOT ELIGIBLE** |
| Minimum credit score | `< 600` | **NOT ELIGIBLE** |
| Minimum working history | `< 1 year` | **NOT ELIGIBLE** |
| DTI ratio | `> 43%` | **NOT ELIGIBLE** |
| DTI ratio | `36% – 43%` | ELIGIBLE, `HIGH` risk — the 43% maximum is inclusive |
| DTI ratio | `20% – 36%` | ELIGIBLE, `MEDIUM` risk — 36% is already `HIGH`, so this band ends at 35.9% |
| DTI ratio | `< 20%` | ELIGIBLE, `LOW` risk — 20% is already `MEDIUM` |
| Credit score | `= 600` | passes — the minimum is inclusive |

`DTI ratio = preExistingDebt / annualIncome`. Thresholds are `private static final` constants in
`LoanEligibilityEngine`: `MIN_ANNUAL_INCOME`, `MIN_CREDIT_SCORE`, `MIN_WORKING_YEARS`, `LOW_DTI`,
`MEDIUM_DTI`, `MAX_DTI` — deliberate private implementation details, so they are not exposed
through the gateway.

The checks are evaluated in the order listed in [Evaluation order](#evaluation-order), so when
several rules fail at once the first one in that order is the reason you see.

---

## Known Gotcha — Fat JAR Exposes Too Many Methods

> **Symptom:** Graftcode Vision shows **2,136 methods** instead of the handful you wrote.

### Root Cause

When you build a **fat JAR** (jar-with-dependencies), Maven bundles every transitive dependency —
including Jackson — directly into your JAR. Graftcode Gateway uses Java reflection to discover
**all public classes** inside the JAR, which means it finds and exposes Jackson's `ObjectMapper`,
`JsonNode`, and hundreds of other public classes alongside your own code.

```
Fat JAR contents:
  com.graftcode.demo.loan.LoanEligibilityEngine   ← your methods
  com.fasterxml.jackson.databind.ObjectMapper     ← ~400 public methods
  com.fasterxml.jackson.databind.JsonNode         ← ~300 public methods
  ... (hundreds more Jackson + JUnit + other classes)

Result: 2,136 methods discovered instead of a handful.
```

### How this project avoids it

1. **Thin JAR only.** `pom.xml` has no assembly plugin and no compile-scoped dependencies —
   JUnit is `test`-scoped, so it never reaches the JAR. `mvn package` emits a single
   `loan-eligibility-engine-1.0.0.jar`.
2. **`gg --modules` points at that thin JAR** in the `Dockerfile`.
3. **Helper logic is `private`, not a separate public class.** The rule checks and the
   DTI-to-risk mapping live in `private static` methods inside `LoanEligibilityEngine`, so the
   gateway discovers exactly the three intended methods. The earlier public `validation/` helper
   classes and the `LoanApplication` / `EligibilityResult` / `RiskLevel` model classes are all
   gone — nothing extra is discovered.
4. **Tests run during the image build.** Because no package-private cross-package helpers exist,
   the test sources compile and execute, so the `Dockerfile` uses plain `mvn package -q` — matching
   the official quick-start — rather than skipping tests.

### Guard against stale classes

The `Dockerfile` copies the whole project (`COPY . /usr/app/`) and then runs `mvn package -q` — note
that this is **not** `mvn clean package`. So if the host had a `target/` directory from an earlier
local build, its old `.class` files would be copied into the image, survive the build, and be
packaged into the JAR — and Graftcode Gateway would expose those stale classes.

A [.dockerignore](.dockerignore) containing `target/` prevents this at the source: the host's build
output never enters the build context. Each image build therefore compiles only from sources, which
is also why it stays fast. (Use `mvn clean package` locally, where incremental builds are the thing
that leaves orphaned classes behind.)

### General Rule

> **Only bundle what Graftcode should expose.** If a class or library is an implementation detail,
> either exclude it from the JAR or make it `private` / package-private. The thin JAR (project
> classes only) is always the right target for `gg --modules`.

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Java 21 |
| Build | Maven 3.9 |
| Service exposure | Graftcode Gateway (`gg`) |
| Containerization | Docker / Docker Compose |
| Testing | JUnit 5 (Jupiter) 5.10.2 + Surefire 3.2.5 |
| HTTP Framework | **None required** |

`pom.xml` sets `maven.compiler.parameters=true` so parameter names are retained in the bytecode —
reflection-based tooling such as the gateway can then label method arguments by name.

---

*Built to demonstrate [Graftcode Gateway](https://docs.graftcode.com/quick-start/expose-backend/java) — turn any Java class into a remotely callable service.*
