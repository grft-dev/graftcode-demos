FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /src
COPY --from=graftcode_logger . /src/graftcode-logger/
COPY services/TemperatureConversionService/ /src/service/
WORKDIR /src/service
RUN dotnet publish TemperatureConversionService.csproj -c Release -r linux-x64 -o /app -v q \
    -p:GraftCodeLoggerProject=/src/graftcode-logger/GraftCodeNetcoreLogger.csproj
WORKDIR /app
COPY docker/temperature-servicebus-entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh \
    && apt-get update && apt-get install -y curl \
    && curl -fsSL https://grft.dev/get/plugin/servicebus | sed -e '/^show_intro$/d' -e 's|> /dev/tty||' | sh \
    && ARCH=$(dpkg --print-architecture) \
    && curl -fsSL -o /app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
    && dpkg -i /app/gg.deb && rm /app/gg.deb \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
ENV LD_LIBRARY_PATH=/app
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
