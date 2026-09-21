# Stage 1: Build the .NET library
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY official/electric-company-be/EnergyPriceService.csproj .
RUN dotnet restore --source https://api.nuget.org/v3/index.json EnergyPriceService.csproj
COPY official/electric-company-be/*.cs .
RUN dotnet publish EnergyPriceService.csproj -c Release --no-restore -o /out

# Stage 2: Graftcode Gateway runtime (Linux, includes the gg gateway binary + .NET runtime)
FROM graftcode/netcore:10.0
WORKDIR /app
COPY --from=build /out/ .

# WebSocket port (Azure Container Apps ingress terminates TLS, forwards plain WS to port 80)
EXPOSE 80

# GG_PROJECT_KEY is injected at deploy time via --env-vars (never baked into the image).
# Omit --projectKey unless the env var is a real JWT from https://portal.graftcode.com —
# a fake/placeholder key crashes startup: "Error decoding projectKey: JwtToken decode failed".
ENTRYPOINT ["sh", "-c", "extra=\"\"; if [ -n \"$GG_PROJECT_KEY\" ] && [ \"$GG_PROJECT_KEY\" != \"<paste_your_project_key_here>\" ]; then extra=\"--projectKey $GG_PROJECT_KEY\"; fi; exec gg $extra --runtime netcore --modules /app/EnergyPriceService.dll --port 80"]
