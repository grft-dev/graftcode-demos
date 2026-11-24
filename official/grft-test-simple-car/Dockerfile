FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG VERSION=0.2.1
WORKDIR /src

COPY grftTestSimpleCar/grftTestSimpleCar.csproj grftTestSimpleCar/
RUN dotnet restore grftTestSimpleCar/grftTestSimpleCar.csproj

COPY grftTestSimpleCar/ grftTestSimpleCar/
RUN dotnet build grftTestSimpleCar/grftTestSimpleCar.csproj -c Release -o /app/build /p:Version=${VERSION}

FROM mcr.microsoft.com/dotnet/runtime:9.0 AS runtime

ARG GG_VERSION=latest

RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

# GG install - supports 'latest' or specific version like '1.2.0'
RUN if [ "$GG_VERSION" = "latest" ]; then \
        GG_URL="https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_amd64.deb"; \
    else \
        GG_URL="https://github.com/grft-dev/graftcode-gateway/releases/download/v${GG_VERSION}/gg_linux_amd64.deb"; \
    fi && \
    wget -qO /tmp/gg.deb "$GG_URL" && \
    dpkg -i /tmp/gg.deb && \
    rm /tmp/gg.deb

WORKDIR /usr/app
COPY --from=build /app/build/grft-test-simple-car-e2e.dll .

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=1

EXPOSE 80
EXPOSE 81

# GG_PROJECT_KEY env var enables project-key mode (optional)
CMD sh -c 'gg --endpoint ${GG_ENDPOINT:-https://d.grft.dev} --modules grft-test-simple-car-e2e.dll --runtime netcore ${GG_PROJECT_KEY:+--projectKey $GG_PROJECT_KEY}'
