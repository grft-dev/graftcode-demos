FROM python:3.13-bookworm
WORKDIR /usr/app
COPY ./loan_calculator.py /usr/app/loan-service/
COPY ./pyproject.toml /usr/app/loan-service/
RUN apt-get update && apt-get install -y wget \
 && ARCH=$(dpkg --print-architecture) \
 && wget -q -O /usr/app/gg.deb "https://github.com/grft-dev/graftcode-gateway/releases/latest/download/gg_linux_${ARCH}.deb" \
 && dpkg -i /usr/app/gg.deb && rm /usr/app/gg.deb \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
EXPOSE 80
EXPOSE 81
CMD ["gg", "--modules", "./loan-service/"]
