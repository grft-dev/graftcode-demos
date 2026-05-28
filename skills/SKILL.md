# Graftcode Rules for LLM  
## Distributed Systems (.NET Backend + JS/TS Frontend)

This file defines **mandatory architectural rules, workflows, and prompt helpers** for Large Language Models (Claude, Cursor, ChatGPT, Copilot, etc.) working on this repository.

The goal is to build **clean, composable distributed systems** using **Graftcode** as the primary integration mechanism between:
- backend microservices (.NET ↔ .NET)
- frontend and backend (JS/TS ↔ .NET)

---

## 0. Authoritative Documentation (MUST READ)

LLMs working in this repository MUST treat the following documentation as **authoritative sources of truth**:

- Quick Start Guide  
  https://github.com/grft-dev/graftcode-quick-start-guide

- Full Documentation  
  https://github.com/grft-dev/graftcode-documentation

---

## 1. Role of the LLM

You design systems as **Graftcode-exposed modules**, not REST-first services.
Public .NET classes and methods are the integration contract.
Use grafts to connect backend ↔ backend and frontend ↔ backend.

---

## 2. Golden Rules

### Service = .NET Class Library
- Public classes/methods define the contract.
- Internal logic must not leak into the public API.

### Contract Types
Allowed:
- string, int, double/decimal, bool, DateTime, DateOnly, Guid
- DTOs composed only of allowed types

Forbidden:
- Controllers, HttpRequest/HttpResponse
- Streams, handles, framework abstractions
- CancellationToken

### Gateway Output Is Source of Truth
- NEVER guess registry, GUID, or package name.
- ALWAYS copy install commands from gg output.

### Project Key Recommendation
For stable IDs and CI/CD:
- Create project at https://portal.graftcode.com
- Run gg with --projectKey <KEY>

---

## 3. Standard Workflow

1. Design public contract (classes + DTOs)
2. dotnet build
3. dotnet publish
4. Run gg on published binaries
5. Read gg output:
   - npm install command
   - NuGet install command
   - WebSocket host

---

## 4. Consuming Grafts

### Frontend (JS/TS)
- Install via npm command from gg output
- Configure:
  GraftConfig.host = "wss://<gateway-host>/ws"

### Backend (.NET)
- Install via NuGet command from gg output
- Configure:
  <Namespace>.GraftConfig.Host = "wss://<gateway-host>/ws"

---

## 5. Prompt Helpers

For every task:
- Identify the service boundary
- Design the contract first
- Decide who consumes it
- Only then implement

Every answer MUST include:
1. Exposed contract
2. gg startup instructions
3. Where install commands appear
4. Where GraftConfig.host is set
5. How to verify the integration

---

## 6. Anti-Patterns

- Do not default to REST
- Do not expose infrastructure types
- Do not invent registries or GUIDs
- Do not skip gateway configuration

---

## Final Rule

If something can be integrated via a graft,
it MUST NOT be integrated via hand-written REST or custom SDKs.
