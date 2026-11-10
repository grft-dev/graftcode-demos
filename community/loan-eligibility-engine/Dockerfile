# ─────────────────────────────────────────────────────────────────────────────
# Build: Maven + JDK 21 — compiles the JAR
# ─────────────────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21

WORKDIR /usr/app

# Install wget (needed to download gg.deb from GitHub releases)
RUN apt-get update \
    && apt-get install -y wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Download and install Graftcode Gateway directly from GitHub releases
# (More reliable than curl pipe — avoids partial-download failures)
RUN wget -O /usr/app/gg.deb \
    https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_amd64.deb \
    && dpkg -i /usr/app/gg.deb \
    && rm /usr/app/gg.deb

# Copy project files and build the JAR
COPY . /usr/app/
RUN mvn package -q

# ─────────────────────────────────────────────────────────────────────────────
# Ports:
#   80  — Graftcode Gateway service call handler + Vision UI/WebSocket (/GV)
#   81  — secondary port; serves the Vision page but NOT the WebSocket backend
# ─────────────────────────────────────────────────────────────────────────────
EXPOSE 80
EXPOSE 81

# Launch Graftcode Gateway pointing at the compiled JAR.
# This gg build logs "Graft Vision is available on http://localhost:80", so the
# Vision UI and its WebSocket live on port 80. Visit http://localhost:8080/GV
# (port 80 as mapped by docker-compose.yml).
CMD ["gg", "--modules", \
     "/usr/app/target/loan-eligibility-engine-1.0.0.jar"]
