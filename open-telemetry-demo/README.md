# Graftcode Telemetry Demo

Proof of concept for correlated telemetry across a React frontend and Graftcode-hosted .NET services.

- The browser uses `@graftcode/browser-logger`, which follows the `@graftcode/logger` API and uses the Application Insights browser SDK's OpenTelemetry-compatible span API.
- The backends use `GraftCodeNetcoreLogger`, matching existing GraftingAgent services such as `graftcode-code-generator`.
- Browser fetch/XHR instrumentation sends W3C `traceparent`; the Vite h2c proxy forwards it and each backend continues the trace from `Graftcode.Context.RequestContext`.
- Outbound graft calls between backends are traced with manual `GraftTelemetry.RunGraftCall` wrappers in `UserService` and `CityWeatherService`, which call `InvokeWithHeaders` and emit `Graft → …` logger dependencies. Published `graft.nuget.*` clients are built against the released Hypertube SDK; mixing them with a local `HYPERTUBE` build causes `MissingMethodException` at runtime.
- `AccountService` stores demo user accounts in Azure SQL. OpenTelemetry SqlClient instrumentation records database dependencies automatically.
- `UserService` and `CityWeatherService` call `AccountService`, `TemperatureConversionService`, and the external weather API through graft; logger operations and `Graft → …` dependencies cover each hop (Service Bus transport dependencies when the plugin is used).

Telemetry never includes credentials, JWTs, usernames, city names, weather payloads, SQL statements, or response bodies.

## Architecture

```
Frontend (Vite :5173)
  → UserService (graft h2) → AccountService (graft ws) → Azure SQL
  → CityWeatherService (graft h2) → AccountService (city authorization)
                                 → TemperatureConversionService x3 (Azure Service Bus plugin)
                                 → External WeatherService (wss://dotnetweatherapi.onrender.com/ws)
```

## Prerequisites

- Node.js 22 or later
- .NET SDK 9
- Docker Desktop with Compose
- Access to the `GraftCodeDevPackages` NuGet/npm feeds

The frontend consumes `@graftcode/browser-logger` from the `GraftCodeDevPackages` npm feed. Copy `frontend/.npmrc.example` to `frontend/.npmrc` and authenticate with Azure DevOps before running `npm install`.
The .NET projects prefer the sibling `graftcode-logger` project when it exists and fall back to `GraftCodeNetcoreLogger` 3.0.5 from `GraftCodeDevPackages` in standalone layouts. Docker Compose supplies the local logger as an additional build context. Hypertube comes from the published graft NuGet packages only (not the local `HYPERTUBE` repo) so graft clients stay binary-compatible.

## Configure Application Insights and Azure SQL

Use the existing development Application Insights connection string. Do not commit its real value.

1. Copy `.env.example` to `.env` and set:
   - `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - `AZURE_SQL_SA_PASSWORD` (default `CityWeatherDemo123!` is fine for local Docker)
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` to the same development resource.
3. Set Azure Service Bus values in `.env` (see [Service Bus plugin](#azure-service-bus-plugin) below).

The browser connection string is visible to browser users by design. It identifies the ingestion resource and must not be treated as an application secret.

If either telemetry variable is omitted, the corresponding logger falls back to console output and the application continues to run.

## Azure Service Bus plugin

`TemperatureConversionService` is hosted through the [Service Bus plugin](https://github.com/grft-dev/graftcode-plugins/tree/main/servicebus) instead of direct WebSocket graft. `CityWeatherService` calls it through the same plugin on the client side.

Configure `.env` with:

- `SERVICE_BUS_CONNECTION_STRING`
- `SERVICE_BUS_QUEUE` (request queue)
- `SERVICE_BUS_REPLY_QUEUE` (session-enabled reply queue)
- `SERVICE_BUS_RPC_TIMEOUT_MS` (optional, default `30000`)

Create the queues in your namespace before starting the demo. The reply queue must have sessions enabled (`--enable-session true`). See the plugin README for details.

## Run locally

Build and start backends. Run **3 instances** of the temperature converter for competing-consumer load balancing:

```powershell
docker compose up --build --scale temperature-conversion-service=3
```

If you previously built images with local `HYPERTUBE` project references, clear stale layers first:

```powershell
docker compose build --no-cache
docker compose up --force-recreate --scale temperature-conversion-service=3
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `https://localhost:5173`. Sign in with demo users (`wad` / `password`, `alice` / `alice`, `bob` / `bob`), load the city list, and request weather.

Expected Application Insights roles:

- `GraftCodeOpenTelemetryDemoFrontend`
- `GraftCodeOpenTelemetryDemoUserServiceNetcore`
- `GraftCodeOpenTelemetryDemoCityWeatherServiceNetcore`
- `GraftCodeOpenTelemetryDemoAccountServiceNetcore`
- `GraftCodeOpenTelemetryDemoTemperatureConversionServiceNetcore` (3 scaled instances via Service Bus)

Expected nested operations in end-to-end traces:

- `Graft → AccountFacade.ValidateCredentials` (and similar `Graft → …` dependencies from `GraftTelemetry.RunGraftCall`)
- `ValidateCredentials`, `GetCitiesForUser`, `IsCityAllowedForUser`, `ConvertCelsiusToFahrenheit` (business operations via `GraftCodeNetcoreLogger`)
- `azure.servicebus` dependencies when TemperatureConversionService uses the Service Bus plugin (when `GraftcodeLoggerHypertubeTelemetry` is available against a matching Hypertube build)
- SQL dependencies on `AccountService` (OpenTelemetry SqlClient instrumentation)

Hypertube auto-telemetry (`hypertube.*` spans) requires graft client packages regenerated against the current `HYPERTUBE` build. Until then, the demo uses logger-based graft call tracing only.

## Local .NET builds without Docker

`UserService` and `CityWeatherService` depend on graft packages from the registries in `NuGet.config`. Update those URLs if you re-host AccountService or TemperatureConversionService.

```powershell
dotnet build services/UserService/UserService.csproj
dotnet build services/CityWeatherService/CityWeatherService.csproj
```

## Verify telemetry

Find recent POC telemetry:

```kusto
union requests, dependencies, traces, exceptions
| where timestamp > ago(30m)
| extend ServiceName = tostring(customDimensions.ServiceName)
| where cloud_RoleName startswith "GraftCodeOpenTelemetryDemo"
    or ServiceName startswith "GraftCodeOpenTelemetryDemo"
| project timestamp, itemType, name, operation_Id, operation_ParentId,
    cloud_RoleName, ServiceName, success, resultCode
| order by timestamp desc
```

Copy an `operation_Id` from a browser dependency, then inspect the complete trace:

```kusto
let traceId = "<operation_Id>";
union requests, dependencies, traces, exceptions
| where operation_Id == traceId
| project timestamp, itemType, name, operation_ParentId,
    cloud_RoleName, customDimensions, success, resultCode
| order by timestamp asc
```

To verify error correlation, submit invalid login credentials. The browser and user-service exception telemetry should share an operation ID. Do not use real credentials for this check.

## Build checks

```powershell
dotnet build services/TemperatureConversionService/TemperatureConversionService.csproj
dotnet build services/AccountService/AccountService.csproj
dotnet build services/UserService/UserService.csproj
dotnet build services/CityWeatherService/CityWeatherService.csproj
cd frontend
npm run build
```
