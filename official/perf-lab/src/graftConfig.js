import { GraftConfig } from '@graft/nuget-energypriceservice'

function trimEnv(value) {
  const v = value?.trim()
  return v || null
}

/** gg HTTP/2 path (ACA demo-ecbe-h2 ingress `http2` → container :81). */
const REMOTE_GRAFT_H2_PATH = '/h2'

function defaultLocalGraftWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:5173/graft-ws'
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProto}://${window.location.host}/graft-ws`
}

/**
 * Hypertube HTTP/2 hosts must be http(s) URLs ending in `/h2`, not `wss://…/ws`.
 * ACA terminates TLS; callers use `https://host/h2` (target port 83 is not in the URL).
 */
export function normalizeGraftHttp2Host(wsOrHttpUrl) {
  if (!wsOrHttpUrl) return wsOrHttpUrl

  try {
    const u = new URL(wsOrHttpUrl)
    if (u.protocol === 'ws:') u.protocol = 'http:'
    else if (u.protocol === 'wss:') u.protocol = 'https:'

    const path = u.pathname.replace(/\/$/, '') || ''
    if (path === REMOTE_GRAFT_H2_PATH || path.endsWith(REMOTE_GRAFT_H2_PATH)) {
      return u.toString().replace(/\/$/, '')
    }

    if (path === '/ws' || path.endsWith('/ws')) {
      u.pathname = REMOTE_GRAFT_H2_PATH
      return u.toString()
    }

    if (!path || path === '/') {
      u.pathname = REMOTE_GRAFT_H2_PATH
      return u.toString()
    }

    return u.toString()
  } catch {
    return wsOrHttpUrl
  }
}

export function getGraftWsEndpointUrls() {
  const fromEnvHttp1 = trimEnv(import.meta.env.VITE_GRAFT_WS_URL_HTTP1)
  const fromEnvHttp2 =
    trimEnv(import.meta.env.VITE_GRAFT_H2_URL_HTTP2) ??
    trimEnv(import.meta.env.VITE_GRAFT_WS_URL_HTTP2)
  const legacy = trimEnv(import.meta.env.VITE_GRAFT_WS_URL)

  const http1 =
    fromEnvHttp1 ?? (import.meta.env.DEV ? defaultLocalGraftWsUrl() : legacy) ?? defaultLocalGraftWsUrl()

  let http2 = fromEnvHttp2
  if (!http2) {
    if (!import.meta.env.DEV && legacy) http2 = legacy
    else if (legacy && legacy !== http1) http2 = legacy
    else http2 = legacy ?? http1
  }

  return { http1, http2 }
}

export function isGraftTransportSwitchAvailable() {
  const { http1, http2 } = getGraftWsEndpointUrls()
  return http1 !== http2
}

export function resolveGraftWsUrl(mode) {
  const { http1, http2 } = getGraftWsEndpointUrls()
  if (http1 === http2) return http1
  return mode === 'http1' ? http1 : http2
}

/** Runtime host for GraftConfig (WebSocket on HTTP/1.1, HTTPS `/h2` on HTTP/2). */
export function resolveGraftRuntimeHost(mode) {
  const localH2Path = import.meta.env.VITE_GRAFT_H2_PATH ?? '/graft/h2'
  const useLocalH2Transport =
    import.meta.env.VITE_GRAFT_TRANSPORT === 'h2' && mode === 'http1' && typeof window !== 'undefined'

  if (useLocalH2Transport) {
    return `${window.location.origin}${localH2Path}`
  }

  const url = resolveGraftWsUrl(mode)
  if (mode === 'http2') {
    return normalizeGraftHttp2Host(url)
  }
  return url
}

/** Configure GraftConfig.host for the selected backend mode (WebSocket or HTTP/2). */
export function applyGraftConfigHost(mode) {
  return resolveGraftRuntimeHost(mode)
}

function graftUserConnectionString(host) {
  return `name=${GraftConfig.graftName}; runtime=${GraftConfig.runtimeName}; modules=${GraftConfig.module}; host=${host}; stateless=true`
}

/**
 * Apply perf-lab host to GraftConfig (User priority). Must run before the first {@link GraftConfig.init}.
 * WS vs HTTP/2 is selected by the host URL shape (`wss://…/ws` vs `https://…/h2`).
 */
export function configureGraftHost(host) {
  GraftConfig.host = host
  GraftConfig.stateless = true
  if (GraftConfig.rtmCtx == null) {
    GraftConfig.setConfig(graftUserConnectionString(host))
  }
}

export function configureGraftForHttpMode(mode) {
  configureGraftHost(resolveGraftRuntimeHost(mode))
}
