import { useEffect, useState } from 'react'
import * as api from './api.js'

function ResultRow({ label, data, error }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {error ? (
          <span style={{ color: 'crimson' }}>{error}</span>
        ) : data === null ? (
          '…'
        ) : (
          <code>{JSON.stringify(data)}</code>
        )}
      </td>
    </tr>
  )
}

export default function App() {
  const [results, setResults] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const calls = [
      ['CalculateMonthlyBill', () => api.calculateMonthlyBill({ usageKWh: 450, baseRatePerKWh: 0.12, taxRatePercent: 8 })],
      ['ApplyLateFee', () => api.applyLateFee({ currentAmount: 120, daysLate: 5, dailyRatePercent: 0.5 })],
      ['CalculateTax', () => api.calculateTax({ amount: 200, taxRatePercent: 7.5 })],
      ['IsBudgetBillingEligible', () => api.isBudgetBillingEligible({ averageMonthlyUsageKWh: 600, thresholdKWh: 500 })],
      ['NetConsumptionKWh', () => api.netConsumptionKWh({ previousReadingKWh: 12000, currentReadingKWh: 12450 })],
      ['IsReadingValid', () => api.isReadingValid({ previousReadingKWh: 12000, currentReadingKWh: 12450, maxAllowedJumpKWh: 800 })],
      ['EstimateAverageDailyUsage', () => api.estimateAverageDailyUsage({ usageKWh: 450, days: 30 })],
      ['ProjectNextCycleUsageKWh', () => api.projectNextCycleUsageKWh({ recentAvgDailyKWh: 15, daysInCycle: 30 })],
      ['DetermineTier', () => api.determineTier({ usageKWh: 750, tier1ThresholdKWh: 400, tier2ThresholdKWh: 900 })],
      [
        'CalculateTieredCost',
        () =>
          api.calculateTieredCost({
            usageKWh: 750,
            baseRate: 0.08,
            tier1ThresholdKWh: 400,
            tier1Rate: 0.02,
            tier2ThresholdKWh: 900,
            tier2Rate: 0.04,
            tier3Rate: 0.06,
          }),
      ],
      [
        'ApplyTimeOfUseAdjustment',
        () =>
          api.applyTimeOfUseAdjustment({
            baseAmount: 100,
            peakHoursUsed: 120,
            offPeakHoursUsed: 180,
            peakMultiplier: 1.2,
            offPeakMultiplier: 0.85,
          }),
      ],
      ['IsRebateEligible', () => api.isRebateEligible({ outageMinutes: 240, eligibilityThresholdMinutes: 180 })],
      [
        'CalculateOutageRebate',
        () =>
          api.calculateOutageRebate({
            monthlyBillAmount: 150,
            outageMinutes: 300,
            minutesPerCredit: 60,
            creditPerUnit: 5,
          }),
      ],
      ['EstimateRestorationTimeMinutes', () => api.estimateRestorationTimeMinutes({ baseRepairMinutes: 90, crewCount: 3, severityLevel: 2 })],
      ['CalculateLoyaltyDiscountPercent', () => api.calculateLoyaltyDiscountPercent({ yearsAsCustomer: 6, onTimePaymentCount: 24 })],
      ['IsVipEligible', () => api.isVipEligible({ yearsAsCustomer: 6, averageMonthlyBillAmount: 220 })],
      ['RewardPointsForUsage', () => api.rewardPointsForUsage({ usageKWh: 450 })],
      ['ApplyLoyaltyDiscount', () => api.applyLoyaltyDiscount({ amount: 180, discountPercent: 10 })],
      ['GetPrice', () => api.getPrice()],
      ['GetPriceHistory', () => api.getPriceHistory({ count: 3 })],
    ]

    let cancelled = false

    calls.forEach(([key, run]) => {
      run()
        .then((data) => {
          if (!cancelled) {
            setResults((prev) => ({ ...prev, [key]: data }))
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setErrors((prev) => ({ ...prev, [key]: err.message }))
          }
        })
    })

    return () => {
      cancelled = true
    }
  }, [])

  const rows = [
    'CalculateMonthlyBill',
    'ApplyLateFee',
    'CalculateTax',
    'IsBudgetBillingEligible',
    'NetConsumptionKWh',
    'IsReadingValid',
    'EstimateAverageDailyUsage',
    'ProjectNextCycleUsageKWh',
    'DetermineTier',
    'CalculateTieredCost',
    'ApplyTimeOfUseAdjustment',
    'IsRebateEligible',
    'CalculateOutageRebate',
    'EstimateRestorationTimeMinutes',
    'CalculateLoyaltyDiscountPercent',
    'IsVipEligible',
    'RewardPointsForUsage',
    'ApplyLoyaltyDiscount',
    'GetPrice',
    'GetPriceHistory',
  ]

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 960 }}>
      <h1>Energy tools</h1>
      <p>REST results for every public backend method:</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Method</th>
            <th align="left">Response</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => (
            <ResultRow
              key={key}
              label={key}
              data={results[key] ?? null}
              error={errors[key]}
            />
          ))}
        </tbody>
      </table>
    </main>
  )
}
