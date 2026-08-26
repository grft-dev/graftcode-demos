FROM python:3.13-bookworm

WORKDIR /usr/app

COPY ./energy_price_calculator.py /usr/app/energy-service/
COPY ./pyproject.toml /usr/app/energy-service/

ARG TARGETARCH
RUN apt-get update \
    && apt-get install -y wget \
    && wget -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${TARGETARCH}.deb" \
    && dpkg -i /usr/app/gg.deb \
    && rm /usr/app/gg.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 80
EXPOSE 81

CMD ["gg","--modules","./energy-service/"]