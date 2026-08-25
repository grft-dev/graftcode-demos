using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BillingController : ControllerBase
    {
        [HttpPost("calculate-monthly-bill")]
        public ActionResult<double> CalculateMonthlyBill([FromBody] CalculateMonthlyBillRequest request)
        {
            var result = BillingLogic.CalculateMonthlyBill(request.usageKWh, request.baseRatePerKWh, request.taxRatePercent);
            return Ok(result);
        }

        [HttpPost("apply-late-fee")]
        public ActionResult<double> ApplyLateFee([FromBody] ApplyLateFeeRequest request)
        {
            var result = BillingLogic.ApplyLateFee(request.currentAmount, request.daysLate, request.dailyRatePercent);
            return Ok(result);
        }

        [HttpPost("calculate-tax")]
        public ActionResult<double> CalculateTax([FromBody] CalculateTaxRequest request)
        {
            var result = BillingLogic.CalculateTax(request.amount, request.taxRatePercent);
            return Ok(result);
        }

        [HttpPost("is-budget-billing-eligible")]
        public ActionResult<bool> IsBudgetBillingEligible([FromBody] IsBudgetBillingEligibleRequest request)
        {
            var result = BillingLogic.IsBudgetBillingEligible(request.averageMonthlyUsageKWh, request.thresholdKWh);
            return Ok(result);
        }
    }
}


