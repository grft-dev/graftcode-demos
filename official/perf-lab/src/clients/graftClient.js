import { EnergyPriceService } from '@graft/nuget-energypriceservice'

// metrics:begin graft.getPrice.client
export function graftGetPrice() {
  return EnergyPriceService.getPrice()
}
// metrics:end graft.getPrice.client

// metrics:begin graft.history.client
export function graftGetPriceHistory(count) {
  return EnergyPriceService.getPriceHistory(count)
}
// metrics:end graft.history.client
