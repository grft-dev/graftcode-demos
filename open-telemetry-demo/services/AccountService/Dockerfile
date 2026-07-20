FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /src
COPY --from=graftcode_logger . /src/graftcode-logger/
COPY services/ /src/services/
WORKDIR /src/services/AccountService
RUN dotnet publish AccountService.csproj -c Release -f net9.0 -r linux-x64 -o /app -v q \
    -p:GraftCodeLoggerProject=/src/graftcode-logger/GraftCodeNetcoreLogger.csproj
WORKDIR /app
RUN apt-get update && apt-get install -y wget \
    && ARCH=$(dpkg --print-architecture) \
    && wget -q -O /app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
    && dpkg -i /app/gg.deb && rm /app/gg.deb \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
EXPOSE 80
EXPOSE 8989
CMD ["gg", "--modules", "AccountService.dll", "--useContext=1", "--http2Server=1", "--http2Port", "8989", "--corsAllowedOrigins=*"]
