FROM mcr.microsoft.com/dotnet/aspnet:9.0

RUN mkdir -p /usr/app \
    && apt-get update \
    && apt-get install -y wget \
    && wget -O /usr/app/gg.deb \
    https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_amd64.deb \
    && dpkg -i /usr/app/gg.deb \
    && rm /usr/app/gg.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY currency_converter ./currency_converter

CMD ["gg", "--runtime", "python", "--modules", "/usr/app/currency_converter/converter.py", "--port", "5002"]
