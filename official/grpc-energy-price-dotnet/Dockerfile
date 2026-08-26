# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY EnergyPriceGrpc.csproj ./
RUN dotnet restore ./EnergyPriceGrpc.csproj

COPY . ./
RUN dotnet publish ./EnergyPriceGrpc.csproj -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# No TLS cert in the container -> the service listens on $PORT in cleartext h2c;
# Azure Container Apps ingress terminates TLS. Set ingress transport to "http2".
ENV PORT=8080
EXPOSE 8080

COPY --from=build /src/out ./
ENTRYPOINT ["dotnet", "EnergyPriceGrpc.dll"]
