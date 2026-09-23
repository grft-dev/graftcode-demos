# Build stage (Node 22 — Vite 7 requires Node 20.19+/22.12+)
FROM node:22-alpine AS build

WORKDIR /app

ARG GRAFT_REGISTRY
COPY package*.json ./
RUN printf '@graft:registry=%s\n' "${GRAFT_REGISTRY}" > .npmrc \
  && npm install \
  && rm -f .npmrc

COPY . .

ARG VITE_REST_URL
ARG VITE_GRPC_URL
ARG VITE_GRAFT_WS_URL
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
