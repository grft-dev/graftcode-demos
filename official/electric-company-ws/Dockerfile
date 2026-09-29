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

# No TLS cert in the container -> Kestrel serves cleartext HTTP/1.1 + h2c on $PORT;
# demo-ecws-h2 sets ingress transport to "http2"; demo-ecws uses "http".
ENV PORT=8080
EXPOSE 8080

COPY --from=build /src/out ./
ENTRYPOINT ["dotnet", "be.dll"]
