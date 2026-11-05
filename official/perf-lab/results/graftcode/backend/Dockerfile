FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY EnergyPriceService.csproj .
COPY *.cs ./
RUN dotnet publish EnergyPriceService.csproj -c Release -o /app/publish

FROM graftcode/netcore:10.0
COPY --from=build /app/publish /usr/app
EXPOSE 80
CMD ["gg", "--runtime", "netcore", "--modules", "/usr/app/EnergyPriceService.dll", "--port", "80"]
