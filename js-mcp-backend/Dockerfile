FROM node:24

ARG TARGETARCH

WORKDIR /usr/app

COPY . /usr/app/

# Install the Graftcode Gateway (gg). wget -q keeps the ~107 MB download quiet.
RUN apt-get update && apt-get install -y wget \
 && wget -q -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${TARGETARCH}.deb" \
 && dpkg -i /usr/app/gg.deb && rm /usr/app/gg.deb \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# 80 = WS / service calls | 81 = Graftcode Vision + MCP endpoint (read gg logs for actual ports)
EXPOSE 80
EXPOSE 81

# gg reads package.json, discovers public static methods, and exposes them
# as Grafts (app-to-app) AND as MCP tools (for AI agents).
CMD ["gg", "./package.json"]
# For a stable MCP URL + registry across restarts, add a free project key:
# CMD ["gg", "./package.json", "--projectKey", "YOUR_PROJECT_KEY"]
