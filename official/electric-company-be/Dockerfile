FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY EnergyPriceService.csproj ./
RUN dotnet restore --source https://api.nuget.org/v3/index.json ./EnergyPriceService.csproj

COPY . ./
RUN dotnet publish ./EnergyPriceService.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0

# TARGETARCH (BuildKit) is "amd64" or "arm64" — matches gg GitHub asset names.
ARG TARGETARCH

RUN mkdir -p /usr/app \
    && apt-get update \
    && apt-get install -y wget \
    && ARCH="$TARGETARCH" \
    && if [ -z "$ARCH" ]; then ARCH=$(dpkg --print-architecture); fi \
    && wget -q -O /usr/app/gg.deb \
    "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
    && dpkg -i /usr/app/gg.deb \
    && rm /usr/app/gg.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish/ /usr/app/

# 80 = WS / service calls | 81 = Graftcode Vision (read gg logs for actual ports)
EXPOSE 80
EXPOSE 81

CMD ["gg", "--runtime", "netcore", "--modules", "/usr/app/EnergyPriceService.dll", "--port", "80", "--httpPort", "81"]
# For a stable registry GUID across restarts, add a real key from portal.graftcode.com:
# CMD ["gg", "--runtime", "netcore", "--modules", "/usr/app/EnergyPriceService.dll", "--port", "80", "--httpPort", "81", "--projectKey", "YOUR_PROJECT_KEY"]
