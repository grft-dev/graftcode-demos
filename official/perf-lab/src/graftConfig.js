function trimEnv(value) {
  const v = value?.trim()
  return v || null
}

function defaultLocalGraftWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:5173/graft-ws'
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProto}://${window.location.host}/graft-ws`
}

export function getGraftWsEndpointUrls() {
  const fromEnvHttp1 = trimEnv(import.meta.env.VITE_GRAFT_WS_URL_HTTP1)
  const fromEnvHttp2 = trimEnv(import.meta.env.VITE_GRAFT_WS_URL_HTTP2)
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

/** Configure GraftConfig.host for the selected backend mode (WebSocket or optional h2). */
export function applyGraftConfigHost(mode) {
  const h2Path = import.meta.env.VITE_GRAFT_H2_PATH ?? '/graft/h2'
  const useH2Transport =
    import.meta.env.VITE_GRAFT_TRANSPORT === 'h2' && mode === 'http1' && typeof window !== 'undefined'

  if (useH2Transport) {
    return `${window.location.origin}${h2Path}`
  }
  return resolveGraftWsUrl(mode)
}
