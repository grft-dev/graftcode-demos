import { loadSharedHttpMode, saveSharedHttpMode } from './restConfig'

export const GRPC_HTTP_MODE_OPTIONS = [
  { type: 'item', value: 'http1', label: 'HTTP/1.1 (local gRPC-Web)' },
  { type: 'item', value: 'http2', label: 'HTTP/2 (Azure ingress)' },
]

function trimEnv(value) {
  const v = value?.trim()
  return v || null
}

function stripSlash(url) {
  return url.replace(/\/$/, '')
}

/** Resolved base URLs for each mode (no trailing slash). */
export function getGrpcEndpointUrls() {
  const fromEnvHttp1 = trimEnv(import.meta.env.VITE_GRPC_URL_HTTP1)
  const fromEnvHttp2 = trimEnv(import.meta.env.VITE_GRPC_URL_HTTP2)
  const legacy = trimEnv(import.meta.env.VITE_GRPC_URL)

  const devOrigin =
    import.meta.env.DEV && typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173'

  const http1 = stripSlash(
    fromEnvHttp1 ?? (import.meta.env.DEV ? `${devOrigin}/grpc` : legacy) ?? `${devOrigin}/grpc`
  )

  let http2 = fromEnvHttp2
  if (!http2) {
    if (!import.meta.env.DEV && legacy) http2 = legacy
    else if (legacy && stripSlash(legacy) !== http1) http2 = legacy
    else http2 = 'https://localhost:5005'
  }
  http2 = stripSlash(http2)

  return { http1, http2 }
}

export function isGrpcTransportSwitchAvailable() {
  const { http1, http2 } = getGrpcEndpointUrls()
  return http1 !== http2
}

export function loadGrpcHttpMode() {
  return loadSharedHttpMode(getGrpcEndpointUrls())
}

export function saveGrpcHttpMode(mode) {
  saveSharedHttpMode(mode)
}

export function resolveGrpcBaseUrl(mode) {
  const { http1, http2 } = getGrpcEndpointUrls()
  if (http1 === http2) return http1
  return mode === 'http1' ? http1 : http2
}

export function grpcTransportHint(mode, baseUrl) {
  const azure = baseUrl?.includes('azurecontainerapps.io')
  if (mode === 'http1') {
    return azure
      ? 'gRPC-Web to Azure (same host as HTTP/2 in this env).'
      : 'gRPC-Web over HTTP/1.1 — Vite /grpc → local Docker :5005.'
  }
  return azure
    ? 'gRPC-Web to Azure Container Apps (ingress HTTP/2).'
    : 'gRPC-Web over HTTP/2 — direct HTTPS (e.g. mkcert on :5005).'
}
