# Architecture — Loan Eligibility Engine with Graftcode Gateway

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                                   │
│                                                                               │
│   Java App       Python App       Node.js App       .NET App                  │
│   ─────────      ───────────      ───────────       ────────                  │
│   // No HTTP client boilerplate — just call the method                        │
│   var result = LoanEligibilityEngine.evaluateLoan(                            │
│                    "Jane Smith", 120000, 5, 12000, 700);                      │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               │  Strongly-typed Graft client
                               │  (auto-generated via Graftcode Vision)
                               │  Language-native: Maven/npm/NuGet/PyPI/...
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     GRAFTCODE GATEWAY (Docker Container)                      │
│                                                                               │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │                        gg (Graftcode Gateway)                          │  │
│   │   gg --modules loan-eligibility-engine-1.0.0.jar                       │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│   Port 80  ──────────────► RPC Call Handler                                  │
│                            Deserializes JSON → method arguments              │
│                            Invokes method via reflection                      │
│                            Serializes the returned String → JSON response     │
│                                                                               │
│                            Graftcode Vision (browser UI) + WebSocket backend  │
│                            Lists all exposed public members                   │
│                            "Try it out" live tester                           │
│                            Package manager install commands                   │
│                            (npm / mvn / pip / NuGet / RubyGems / Composer)     │
│                                                                               │
│   Port 81  ──────────────► Serves the Vision page only, NOT the WebSocket     │
│                            backend — the UI loads but cannot fetch data       │
│                                                                               │
│   (with --projectKey)      MCP Endpoint                                      │
│                            AI agent / LLM callable interface                  │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               │  Java Reflection (class & method discovery)
                               │  No annotation processing
                               │  No framework scanning
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    LOAN ELIGIBILITY ENGINE (Plain Java)                        │
│                                                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                   LoanEligibilityEngine.java                          │   │
│   │                                                                       │   │
│   │  The only exposed class — three public methods:                      │   │
│   │    1. public String evaluateLoan(String applicantName,                │   │
│   │                                  double annualIncome,                  │   │
│   │                                  int workingYears,                     │   │
│   │                                  double preExistingDebt,               │   │
│   │                                  int creditScore)                     │   │
│   │    2. public String validateCreditScore(int creditScore)              │   │
│   │    3. public double calculateDebtToIncomeRatio(double annualIncome,   │   │
│   │                                                double preExistingDebt) │   │
│   │                                                                       │   │
│   │  Package-private and private members are NOT exposed — the risk        │   │
│   │  projection helpers (projectRiskLevel / projectSeverityOfRisk) and     │   │
│   │  the rule checks stay hidden in Graftcode Vision.                      │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│   private static final thresholds (not exposed):                              │
│     MIN_ANNUAL_INCOME = 20_000.0     LOW_DTI    = 0.20                        │
│     MIN_CREDIT_SCORE  = 600          MEDIUM_DTI = 0.36                        │
│     MIN_WORKING_YEARS = 1            MAX_DTI    = 0.43                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Evaluation Flow

`evaluateLoan` runs five checks in order and returns the first failure, or the approved
result with its risk band:

```
evaluateLoan(String applicantName, double annualIncome, int workingYears,
             double preExistingDebt, int creditScore)
       │
       │  (applicantName is display-only — it never affects the decision)
       ▼
  ┌──────────────────────────────────────────────┐
  │  1. Income check                             │
  │     annualIncome >= 20,000?                  │──► NO ──► NOT ELIGIBLE - income reason.
  └──────────────────────────────────────────────┘
       │ YES
       ▼
  ┌──────────────────────────────────────────────┐
  │  2. Credit score check                       │
  │     creditScore >= 600?                      │──► NO ──► NOT ELIGIBLE - credit score reason.
  └──────────────────────────────────────────────┘
       │ YES
       ▼
  ┌──────────────────────────────────────────────┐
  │  3. Working history check                    │
  │     workingYears >= 1?                       │──► NO ──► NOT ELIGIBLE - working years reason.
  └──────────────────────────────────────────────┘
       │ YES
       ▼
  ┌──────────────────────────────────────────────┐
  │  4. Debt-to-income ratio                     │
  │     DTI = preExistingDebt / annualIncome     │
  │     DTI <= 43%?                              │──► NO ──► NOT ELIGIBLE - debt-to-income
  └──────────────────────────────────────────────┘            ratio <x>% exceeds the
       │ YES                                                   maximum of 43%.
       ▼
  ┌──────────────────────────────────────────────┐
  │  5. Risk band from DTI                       │
  │     < 20%  → LOW                             │
  │     20–36% → MEDIUM                          │
  │     36–43% → HIGH                            │
  └──────────────────────────────────────────────┘
       │
       ▼
  String result
    "ELIGIBLE - risk <LEVEL> (debt-to-income ratio <x>%). <severity projection>"
```

Every declining message is prefixed with `NOT ELIGIBLE - ` and ends with a `.`; an approved
message is `ELIGIBLE - risk <LEVEL> (debt-to-income ratio <x>%). <severity projection>`.

## Risk Level Decision Matrix

Risk depends on the debt-to-income ratio only. The LOW and MEDIUM ceilings are exclusive;
the 43% debt-to-income maximum is inclusive.

| DTI ratio | Risk level | Severity projection |
|:---------:|:----------:|---------------------|
| < 20% | **LOW** | Minimal severity - risk is well within acceptable limits. |
| 20% – 36% (20% inclusive, 36% exclusive) | **MEDIUM** | Moderate severity - risk requires standard monitoring. |
| 36% – 43% (inclusive) | **HIGH** | Substantial severity - risk is near the acceptable limit. |
| > 43% | *none* | Application rejected — `NOT ELIGIBLE`, no severity projection returned. |

## Request / Response Shape

`evaluateLoan` takes five scalar parameters and returns a single `String` — there are no
request or response model objects:

| Parameter (input) | Type | Return (output) | Type |
|-------------------|------|-----------------|------|
| `applicantName` | `String` | the human-readable result | `String` |
| `annualIncome` | `double` | | |
| `workingYears` | `int` | | |
| `preExistingDebt` | `double` | | |
| `creditScore` | `int` | | |

The request payload is a flat JSON object with these five fields; the response payload is a
bare JSON string. See [examples/](examples/) for sample payloads.

## Why No HTTP Framework Is Needed

Traditional approach (Spring Boot example):
```java
// ❌ Old way — hundreds of lines of boilerplate
@RestController
@RequestMapping("/api/loans")
public class LoanController {
    @PostMapping("/evaluate")
    public ResponseEntity<String> evaluate(@RequestBody LoanRequest request) {
        // + Controller, Service, Repository layers
        // + OpenAPI annotations
        // + Exception handlers
        // + Security config
        // + Serialization config
        // + Actuator / health endpoints
    }
}
```

Graftcode approach (this project):
```java
// ✅ New way — zero boilerplate
public class LoanEligibilityEngine {
    public String evaluateLoan(String applicantName, double annualIncome, int workingYears,
                               double preExistingDebt, int creditScore) {
        // Business logic only
    }
}
```

Graftcode Gateway handles:
- **Transport**: RPC serialization on port 80
- **Discovery**: reflection-based method exposure (all `public` members)
- **Client generation**: Graftcode Vision generates typed clients in any language
- **API explorer**: Vision UI replaces Swagger/OpenAPI
- **MCP endpoint**: AI-agent compatibility (with project key)
