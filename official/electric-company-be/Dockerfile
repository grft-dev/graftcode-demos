FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY EnergyPriceService.csproj ./
RUN dotnet restore ./EnergyPriceService.csproj

COPY . ./
RUN dotnet publish ./EnergyPriceService.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0

# Pin at build time with --build-arg GG_VERSION=v1.x.x or leave empty for /releases/latest.
ARG GG_VERSION=
RUN mkdir -p /usr/app \
    && apt-get update \
    && apt-get install -y wget ca-certificates \
    && if [ -n "$GG_VERSION" ]; then \
         wget -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/download/${GG_VERSION}/gg_linux_amd64.deb"; \
       else \
         wget -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_amd64.deb"; \
       fi \
    && dpkg -i /usr/app/gg.deb \
    && rm /usr/app/gg.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish/ /usr/app/

CMD ["gg", "--runtime", "netcore", "--modules", "/usr/app/EnergyPriceService.dll", "--port", "81", "--httpPort", "5001"]
