const STORAGE_KEY = 'perf-lab-http-mode'
const LEGACY_GRPC_STORAGE_KEY = 'perf-lab-grpc-http-mode'

export const REST_HTTP_MODE_OPTIONS = [
  { type: 'item', value: 'http1', label: 'HTTP/1.1 (local REST)' },
  { type: 'item', value: 'http2', label: 'HTTP/2 (Azure ingress)' },
]

function trimEnv(value) {
  const v = value?.trim()
  return v || null
}

function stripSlash(url) {
  return url.replace(/\/$/, '')
}

export function getRestEndpointUrls() {
  const fromEnvHttp1 = trimEnv(import.meta.env.VITE_REST_URL_HTTP1)
  const fromEnvHttp2 = trimEnv(import.meta.env.VITE_REST_URL_HTTP2)
  const legacy = trimEnv(import.meta.env.VITE_REST_URL)

  const http1 = stripSlash(
    fromEnvHttp1 ?? (import.meta.env.DEV ? 'http://localhost:8090' : legacy) ?? 'http://localhost:8090'
  )

  let http2 = fromEnvHttp2
  if (!http2) {
    if (!import.meta.env.DEV && legacy) http2 = legacy
    else if (legacy && stripSlash(legacy) !== http1) http2 = legacy
    else http2 = 'https://localhost:8090'
  }
  http2 = stripSlash(http2)

  return { http1, http2 }
}

export function isRestTransportSwitchAvailable() {
  const { http1, http2 } = getRestEndpointUrls()
  return http1 !== http2
}

export function loadRestHttpMode() {
  return loadSharedHttpMode(getRestEndpointUrls())
}

export function saveRestHttpMode(mode) {
  saveSharedHttpMode(mode)
}

export function resolveRestBaseUrl(mode) {
  const { http1, http2 } = getRestEndpointUrls()
  if (http1 === http2) return http1
  return mode === 'http1' ? http1 : http2
}

export function restTransportHint(mode, baseUrl) {
  const azure = baseUrl?.includes('azurecontainerapps.io')
  if (mode === 'http1') {
    return azure
      ? 'REST to Azure (same host as HTTP/2 in this env).'
      : 'REST over HTTP/1.1 — local Docker electric-company-ws :8090.'
  }
  return azure
    ? 'REST to Azure Container Apps (ingress terminates TLS, HTTP/2 to the browser).'
    : 'REST over HTTPS (HTTP/1.1 or HTTP/2 via ALPN, e.g. mkcert on :8090).'
}

/** Shared with gRPC switch — one mode for both integration paths. */
export function loadSharedHttpMode({ http1, http2 }) {
  if (http1 === http2) return 'http2'

  try {
    let stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) stored = localStorage.getItem(LEGACY_GRPC_STORAGE_KEY)
    if (stored === 'http1' || stored === 'http2') return stored
  } catch {
    /* private mode */
  }
  return import.meta.env.DEV ? 'http1' : 'http2'
}

export function saveSharedHttpMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
