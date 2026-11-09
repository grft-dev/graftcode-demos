import { EnergyPriceService, GraftConfig } from '@graft/nuget-energypriceservice'

// metrics:begin graft.getPrice.client
function graftConnectionString(host) {
  return `name=${GraftConfig.graftName}; runtime=${GraftConfig.runtimeName}; modules=${GraftConfig.module}; host=${host}; stateless=true`
}

export function configureGraftHost(host) {
  GraftConfig.host = host
  GraftConfig.stateless = true

  // Before first init: User-priority config (5) wins over DefaultLibrary (6).
  if (GraftConfig.rtmCtx == null) {
    GraftConfig.setConfig(graftConnectionString(host))
    return
  }

  // After init: GraftConfig.host alone does not refresh Hypertube — update the live connection.
  if (GraftConfig.rtmCtx?.connectionData != null) {
    GraftConfig.rtmCtx.connectionData.hostname = host
  }
}

export function graftGetPrice() {
  return EnergyPriceService.getPrice()
}
// metrics:end graft.getPrice.client

// metrics:begin graft.history.client
export function graftGetPriceHistory(count) {
  return EnergyPriceService.getPriceHistory(count)
}
// metrics:end graft.history.client
