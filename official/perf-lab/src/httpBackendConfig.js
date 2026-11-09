import {
  isRestTransportSwitchAvailable,
  loadRestHttpMode,
  resolveRestBaseUrl,
  saveRestHttpMode,
} from './restConfig'

export { loadRestHttpMode }
import {
  isGrpcTransportSwitchAvailable,
  resolveGrpcBaseUrl,
  saveGrpcHttpMode,
} from './grpcConfig'
import { resolveGraftWsUrl } from './graftConfig'

/** When false, HTTP/2 is only on the `/http2` route (no in-app picker). */
const HTTP_BACKEND_HTTP2_UI_ENABLED = false

export const HTTP_BACKEND_MODE_OPTIONS = [
  { type: 'item', value: 'http1', label: 'HTTP/1.1' },
  { type: 'item', value: 'http2', label: 'HTTP/2' },
]

export function normalizePerfLabPath(pathname = '/') {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  let path = pathname || '/'
  if (base && base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length) || '/'
  }
  path = path.replace(/\/$/, '') || '/'
  return path
}

/** `http1` on `/`; `http2` on `/http2` (respects Vite `base` on GitHub Pages). */
export function resolveHttpBackendModeFromPath(pathname) {
  return normalizePerfLabPath(pathname) === '/http2' ? 'http2' : 'http1'
}

export function isHttpBackendSwitchAvailable() {
  if (!HTTP_BACKEND_HTTP2_UI_ENABLED) return false
  return isRestTransportSwitchAvailable() || isGrpcTransportSwitchAvailable()
}

export function loadHttpBackendMode() {
  if (typeof window !== 'undefined' && !HTTP_BACKEND_HTTP2_UI_ENABLED) {
    return resolveHttpBackendModeFromPath(window.location.pathname)
  }
  return loadRestHttpMode()
}

export function saveHttpBackendMode(mode) {
  saveRestHttpMode(mode)
  saveGrpcHttpMode(mode)
}

export function resolveHttpBackendRestUrl(mode) {
  return resolveRestBaseUrl(mode)
}

export function resolveHttpBackendGrpcUrl(mode) {
  return resolveGrpcBaseUrl(mode)
}

export function resolveHttpBackendGraftWsUrl(mode) {
  return resolveGraftWsUrl(mode)
}

export { applyGraftConfigHost, configureGraftForHttpMode } from './graftConfig'
