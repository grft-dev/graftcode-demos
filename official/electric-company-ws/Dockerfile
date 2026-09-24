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

EXPOSE 8090

COPY --from=build /src/out ./
ENTRYPOINT ["dotnet", "be.dll"]
