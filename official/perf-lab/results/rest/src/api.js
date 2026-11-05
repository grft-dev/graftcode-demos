const jsonHeaders = { 'Content-Type': 'application/json' }

export async function calculateMonthlyBill(body) {
  const response = await fetch('/api/calculate-monthly-bill', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`calculateMonthlyBill: ${response.status}`)
  return response.json()
}

export async function applyLateFee(body) {
  const response = await fetch('/api/apply-late-fee', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`applyLateFee: ${response.status}`)
  return response.json()
}

export async function calculateTax(body) {
  const response = await fetch('/api/calculate-tax', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`calculateTax: ${response.status}`)
  return response.json()
}

export async function isBudgetBillingEligible(body) {
  const response = await fetch('/api/is-budget-billing-eligible', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`isBudgetBillingEligible: ${response.status}`)
  return response.json()
}

export async function netConsumptionKWh(body) {
  const response = await fetch('/api/net-consumption-kwh', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`netConsumptionKWh: ${response.status}`)
  return response.json()
}

export async function isReadingValid(body) {
  const response = await fetch('/api/is-reading-valid', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`isReadingValid: ${response.status}`)
  return response.json()
}

export async function estimateAverageDailyUsage(body) {
  const response = await fetch('/api/estimate-average-daily-usage', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`estimateAverageDailyUsage: ${response.status}`)
  return response.json()
}

export async function projectNextCycleUsageKWh(body) {
  const response = await fetch('/api/project-next-cycle-usage-kwh', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`projectNextCycleUsageKWh: ${response.status}`)
  return response.json()
}

export async function determineTier(body) {
  const response = await fetch('/api/determine-tier', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`determineTier: ${response.status}`)
  return response.json()
}

export async function calculateTieredCost(body) {
  const response = await fetch('/api/calculate-tiered-cost', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`calculateTieredCost: ${response.status}`)
  return response.json()
}

export async function applyTimeOfUseAdjustment(body) {
  const response = await fetch('/api/apply-time-of-use-adjustment', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`applyTimeOfUseAdjustment: ${response.status}`)
  return response.json()
}

export async function isRebateEligible(body) {
  const response = await fetch('/api/is-rebate-eligible', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`isRebateEligible: ${response.status}`)
  return response.json()
}

export async function calculateOutageRebate(body) {
  const response = await fetch('/api/calculate-outage-rebate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`calculateOutageRebate: ${response.status}`)
  return response.json()
}

export async function estimateRestorationTimeMinutes(body) {
  const response = await fetch('/api/estimate-restoration-time-minutes', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`estimateRestorationTimeMinutes: ${response.status}`)
  return response.json()
}

export async function calculateLoyaltyDiscountPercent(body) {
  const response = await fetch('/api/calculate-loyalty-discount-percent', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`calculateLoyaltyDiscountPercent: ${response.status}`)
  return response.json()
}

export async function isVipEligible(body) {
  const response = await fetch('/api/is-vip-eligible', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`isVipEligible: ${response.status}`)
  return response.json()
}

export async function rewardPointsForUsage(body) {
  const response = await fetch('/api/reward-points-for-usage', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`rewardPointsForUsage: ${response.status}`)
  return response.json()
}

export async function applyLoyaltyDiscount(body) {
  const response = await fetch('/api/apply-loyalty-discount', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`applyLoyaltyDiscount: ${response.status}`)
  return response.json()
}

export async function getPrice() {
  const response = await fetch('/api/get-price', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({}),
  })
  if (!response.ok) throw new Error(`getPrice: ${response.status}`)
  return response.json()
}

export async function getPriceHistory(body) {
  const response = await fetch('/api/get-price-history', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`getPriceHistory: ${response.status}`)
  return response.json()
}
