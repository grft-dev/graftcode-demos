import { useEffect } from 'react'
import {
  GraftConfig,
  EnergyPriceService,
  BillingLogic,
  MeterLogic,
  TariffLogic,
  OutageLogic,
  LoyaltyLogic,
} from '@graft/nuget-energypriceservice'

GraftConfig.host = 'ws://localhost:80/ws'

function appendResult(value) {
  const out = document.getElementById('out')
  if (!out) return
  const line =
    typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value)
  out.textContent += `${line}\n`
}

export default function App() {
  useEffect(() => {
    ;(async () => {
      appendResult(await EnergyPriceService.getPrice())
      appendResult(await EnergyPriceService.getPriceHistory(12))

      appendResult(
        await BillingLogic.calculateMonthlyBill(420, 0.14, 8.5),
      )
      appendResult(await BillingLogic.applyLateFee(180, 7, 0.25))
      appendResult(await BillingLogic.calculateTax(640, 6))
      appendResult(await BillingLogic.isBudgetBillingEligible(380, 300))

      appendResult(await MeterLogic.netConsumptionKWh(10450, 10780))
      appendResult(await MeterLogic.isReadingValid(10450, 10780, 500))
      appendResult(await MeterLogic.estimateAverageDailyUsage(330, 30))
      appendResult(await MeterLogic.projectNextCycleUsageKWh(11, 28))

      appendResult(await TariffLogic.determineTier(1200, 500, 1500))
      appendResult(
        await TariffLogic.calculateTieredCost(
          1800,
          0.08,
          500,
          0.02,
          1500,
          0.04,
          0.06,
        ),
      )
      appendResult(
        await TariffLogic.applyTimeOfUseAdjustment(200, 6, 18, 1.15, 0.85),
      )

      appendResult(await OutageLogic.isRebateEligible(90, 60))
      appendResult(
        await OutageLogic.calculateOutageRebate(220, 120, 30, 4.5),
      )
      appendResult(await OutageLogic.estimateRestorationTimeMinutes(90, 4, 2))

      appendResult(
        await LoyaltyLogic.calculateLoyaltyDiscountPercent(4, 36),
      )
      appendResult(await LoyaltyLogic.isVipEligible(6, 240))
      appendResult(await LoyaltyLogic.rewardPointsForUsage(520))
      appendResult(await LoyaltyLogic.applyLoyaltyDiscount(175, 12))
    })()
  }, [])

  return (
    <main>
      <h1>Energy tools</h1>
      <pre id="out"></pre>
    </main>
  )
}
