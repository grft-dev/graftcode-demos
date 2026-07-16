#!/bin/sh
set -e

if [ -z "$SERVICE_BUS_CONNECTION_STRING" ] || [ -z "$SERVICE_BUS_QUEUE" ] || [ -z "$SERVICE_BUS_REPLY_QUEUE" ]; then
  echo "SERVICE_BUS_CONNECTION_STRING, SERVICE_BUS_QUEUE, and SERVICE_BUS_REPLY_QUEUE are required for Service Bus hosting." >&2
  exit 1
fi

RPC_TIMEOUT="${SERVICE_BUS_RPC_TIMEOUT_MS:-30000}"

cat > /app/pluginConfig.json <<EOF
{
  "name": "ServiceBusPlugin",
  "connectionString": "${SERVICE_BUS_CONNECTION_STRING}",
  "queue": "${SERVICE_BUS_QUEUE}",
  "replyQueue": "${SERVICE_BUS_REPLY_QUEUE}",
  "rpcTimeoutMs": ${RPC_TIMEOUT}
}
EOF

exec gg \
  --modules TemperatureConversionService.dll \
  --useContext=1 \
  --config /app/pluginConfig.json
