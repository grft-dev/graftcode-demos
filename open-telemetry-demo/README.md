# Graftcode Telemetry Demo

Proof of concept for correlated telemetry across a React frontend and Graftcode-hosted .NET services.

- The browser uses `@graftcode/browser-logger`, which follows the `@graftcode/logger` API and uses the Application Insights browser SDK's OpenTelemetry-compatible span API.
- The backends use `GraftCodeNetcoreLogger`, matching existing GraftingAgent services such as `graftcode-code-generator`.
- Browser fetch/XHR instrumentation sends W3C `traceparent`; the Vite h2c proxy forwards it and each backend continues the trace from `Graftcode.Context.RequestContext`.
- Outbound graft calls between backends forward `traceparent` via `GraftConfig.InvokeWithHeaders`, so AccountService, TemperatureConversionService, and other downstream roles appear in the same end-to-end transaction.
- `AccountService` stores demo user accounts in Azure SQL. OpenTelemetry SqlClient instrumentation records database dependencies automatically.
- `UserService` and `CityWeatherService` call `AccountService`, `TemperatureConversionService`, and the external weather API through graft; each outbound graft call is wrapped in a nested `Graft → Service.Method` operation.

Telemetry never includes credentials, JWTs, usernames, city names, weather payloads, SQL statements, or response bodies.

## Architecture

```
Frontend (Vite :5173)
  → UserService (graft h2) → AccountService (graft ws) → Azure SQL
  → CityWeatherService (graft h2) → AccountService (city authorization)
                                 → TemperatureConversionService (C → F)
                                 → External WeatherService (wss://dotnetweatherapi.onrender.com/ws)
```

## Prerequisites

- Node.js 22 or later
- .NET SDK 9
- Docker Desktop with Compose
- Access to the `GraftCodeDevPackages` NuGet/npm feeds

The frontend consumes `@graftcode/browser-logger` from the `GraftCodeDevPackages` npm feed. Copy `frontend/.npmrc.example` to `frontend/.npmrc` and authenticate with Azure DevOps before running `npm install`.
The .NET projects prefer the sibling `graftcode-logger` project when it exists and fall back to `GraftCodeNetcoreLogger` 3.0.5 from `GraftCodeDevPackages` in standalone layouts. Docker Compose supplies the local logger as an additional build context, so container builds do not require private-feed credentials for that package.

## Configure Application Insights and Azure SQL

Use the existing development Application Insights connection string. Do not commit its real value.

1. Copy `.env.example` to `.env` and set:
   - `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - `AZURE_SQL_SA_PASSWORD` (default `CityWeatherDemo123!` is fine for local Docker)
2. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` to the same development resource.

The browser connection string is visible to browser users by design. It identifies the ingestion resource and must not be treated as an application secret.

If either variable is omitted, the corresponding logger falls back to console output and the application continues to run.

## Run locally

Build and start all backends:

```powershell
docker compose up --build
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
- `GraftCodeOpenTelemetryDemoTemperatureConversionServiceNetcore`

Expected nested operations in end-to-end traces:

- `Graft → AccountFacade.ValidateCredentials`
- `Graft → AccountFacade.GetCitiesForUser`
- `Graft → AccountFacade.IsCityAllowedForUser`
- `Graft → TemperatureFacade.ConvertCelsiusToFahrenheit`
- `Graft → WeatherProvider.GetWeatherForecast`
- SQL dependencies on `AccountService` (OpenTelemetry SqlClient instrumentation)

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
