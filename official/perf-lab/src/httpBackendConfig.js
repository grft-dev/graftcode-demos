import {
  isRestTransportSwitchAvailable,
  loadRestHttpMode,
  resolveRestBaseUrl,
  saveRestHttpMode,
} from './restConfig'
import {
  isGrpcTransportSwitchAvailable,
  resolveGrpcBaseUrl,
  saveGrpcHttpMode,
} from './grpcConfig'
import { isGraftTransportSwitchAvailable, resolveGraftWsUrl } from './graftConfig'

export const HTTP_BACKEND_MODE_OPTIONS = [
  { type: 'item', value: 'http1', label: 'HTTP/1.1' },
  { type: 'item', value: 'http2', label: 'HTTP/2' },
]

export function isHttpBackendSwitchAvailable() {
  return (
    isRestTransportSwitchAvailable() ||
    isGrpcTransportSwitchAvailable() ||
    isGraftTransportSwitchAvailable()
  )
}

export function loadHttpBackendMode() {
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

export { applyGraftConfigHost } from './graftConfig'
