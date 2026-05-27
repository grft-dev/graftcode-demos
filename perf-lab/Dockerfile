# Build stage (Node 22 — Vite 7 requires Node 20.19+/22.12+)
FROM node:22-alpine AS build

WORKDIR /app

# Optional: pass NPM_AUTH_TOKEN and registry URLs for private @graft / @graftcode packages
ARG NPM_AUTH_TOKEN
ARG GRAFT_REGISTRY
ARG GRAFTCODE_REGISTRY

COPY package*.json ./
RUN if [ -n "$NPM_AUTH_TOKEN" ] && [ -n "$GRAFTCODE_REGISTRY" ]; then \
      printf 'registry=https://registry.npmjs.org/\n@graft:registry=%s\n@graftcode:registry=%s\n//%s:_authToken=%s\n' \
        "${GRAFT_REGISTRY:-https://registry.npmjs.org/}" \
        "${GRAFT_REGISTRY}" \
        "${GRAFTCODE_REGISTRY}" \
        "${GRAFTCODE_REGISTRY#https://}" \
        "${NPM_AUTH_TOKEN}" > .npmrc; \
    fi \
  && npm install \
  && rm -f .npmrc

COPY . .

# Backend URLs are baked in at build time. The deploy script passes the deployed
# Container App FQDNs here (after the backends are up).
ARG VITE_REST_URL=https://localhost:8090
ARG VITE_GRPC_URL=https://localhost:5005
ARG VITE_GRAFT_WS_URL=ws://localhost:5000/ws
ENV VITE_GRAFT_WS_URL=$VITE_GRAFT_WS_URL \
    VITE_REST_URL=$VITE_REST_URL \
    VITE_GRPC_URL=$VITE_GRPC_URL

# --logLevel warn suppresses Vite's info logs (which include a "✓" character that
# crashes the Azure CLI's log streamer on non-UTF-8 Windows consoles).
RUN npm run build -- --logLevel warn

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 81 5003

CMD ["nginx", "-g", "daemon off;"]
