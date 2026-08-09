FROM mcr.microsoft.com/dotnet/sdk:9.0

WORKDIR /usr/app

COPY . /usr/app/

RUN dotnet build -v q
RUN dotnet publish -c Release -o /usr/app/ -v q

# Install the Graftcode Gateway (gg). wget -q keeps the ~107 MB download quiet.
# TARGETARCH (set by BuildKit) is "amd64" or "arm64" — matches the gg asset names,
# so this builds natively on Intel/CI and on Apple Silicon alike.
ARG TARGETARCH
RUN apt-get update && apt-get install -y wget \
 && wget -q -O /usr/app/gg.deb https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${TARGETARCH}.deb \
 && dpkg -i /usr/app/gg.deb && rm /usr/app/gg.deb \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# 80 = WS / service calls (ws://host:80/ws)
# 81 = Graftcode Vision (gg v1.2.x). gg v1.3.0 serves Vision on the WS port — read gg logs.
EXPOSE 80
EXPOSE 81

# gg analyzes the assembly, discovers public methods, and exposes them.
CMD ["gg", "--modules", "TripBudgetService.dll"]
# For a stable registry GUID across restarts, add a free project key:
# CMD ["gg", "--modules", "TripBudgetService.dll", "--projectKey", "YOUR_PROJECT_KEY"]
