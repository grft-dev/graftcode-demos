FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /src
COPY --from=graftcode_logger . /src/graftcode-logger/
COPY services/ /src/services/
WORKDIR /src/services/CityWeatherService
COPY services/CityWeatherService/NuGet.Docker.config ./NuGet.config
RUN dotnet publish CityWeatherService.csproj -c Release -f net9.0 -o /app -v q \
    -p:GraftCodeLoggerProject=/src/graftcode-logger/GraftCodeNetcoreLogger.csproj
WORKDIR /app
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://grft.dev/get/plugin/servicebus | sed -e '/^show_intro$/d' -e 's|> /dev/tty||' | sh \
    && ARCH=$(dpkg --print-architecture) \
    && curl -fsSL -o /app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
    && dpkg -i /app/gg.deb && rm /app/gg.deb \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
ENV LD_LIBRARY_PATH=/app
EXPOSE 80
EXPOSE 8989
CMD ["gg", "--modules", "CityWeatherService.dll", "--useContext=1", "--http2Server=1", "--http2Port", "8989", "--corsAllowedOrigins=*"]
