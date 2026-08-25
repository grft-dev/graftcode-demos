# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY be.csproj ./
RUN dotnet restore ./be.csproj

COPY . ./
RUN dotnet publish ./be.csproj -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# No TLS cert in the container -> the service listens on $PORT in cleartext HTTP/1.1;
# Azure Container Apps ingress terminates TLS and serves HTTP/2 to the browser
# (set ingress transport to "auto").
ENV PORT=8080
EXPOSE 8080

COPY --from=build /src/out ./
ENTRYPOINT ["dotnet", "be.dll"]
