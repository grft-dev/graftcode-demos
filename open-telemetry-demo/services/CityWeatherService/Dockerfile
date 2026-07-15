FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /usr/app
COPY . /usr/app/
RUN dotnet restore CityWeatherService.csproj -v q
RUN dotnet build CityWeatherService.csproj -v q
RUN dotnet publish CityWeatherService.csproj -c Release -o /usr/app/ -v q
RUN apt-get update && apt-get install -y wget \
 && ARCH=$(dpkg --print-architecture) \
 && wget -q -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
 && dpkg -i /usr/app/gg.deb && rm /usr/app/gg.deb \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
EXPOSE 80
EXPOSE 8989
CMD ["gg", "--modules", "CityWeatherService.dll", "--useContext=1", "--http2Server=1", "--http2Port", "8989", "--corsAllowedOrigins=*"]
