// Handwritten REST client for the energy-price service.

// metrics:begin rest.getPrice.client
export async function fetchEnergyPrice(baseUrl) {
  const response = await fetch(`${baseUrl}/api/EnergyPrice/price`)
  if (!response.ok) {
    throw new Error(`REST failed (${response.status})`)
  }
  return response.json()
}
// metrics:end rest.getPrice.client

// metrics:begin rest.history.client
export async function fetchEnergyPriceHistory(baseUrl, count) {
  const response = await fetch(`${baseUrl}/api/EnergyPrice/history?count=${count}`)
  if (!response.ok) {
    throw new Error(`REST history failed (${response.status})`)
  }
  const body = await response.json()
  return Array.isArray(body) ? body.length : 0
}
// metrics:end rest.history.client
