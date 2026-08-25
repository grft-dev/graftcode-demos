# Stage 1: Build the .NET library
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY official/electric-company-be/EnergyPriceService.csproj .
RUN dotnet restore
COPY official/electric-company-be/ .
RUN dotnet build -c Release --no-restore -o /out

# Stage 2: Graftcode Gateway runtime (Linux, includes the gg gateway binary + .NET runtime)
FROM graftcode/netcore:10.0-latest
WORKDIR /app
COPY --from=build /out/EnergyPriceService.dll .

# WebSocket port (Azure Container Apps ingress terminates TLS, forwards plain WS to port 80)
EXPOSE 80

# GG_PROJECT_KEY is injected at deploy time via --env-vars (never baked into the image).
# GMA and GSMU are disabled — the npm client package is already published to the registry.
# GV (Graftcode Vision UI) is disabled — not needed in production.
ENTRYPOINT ["sh", "-c", "gg --projectKey \"$GG_PROJECT_KEY\" --runtime netcore --modules /app/EnergyPriceService.dll --port 80 --GV=false"]
