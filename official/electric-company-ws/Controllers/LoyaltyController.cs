using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoyaltyController : ControllerBase
    {
        [HttpPost("calculate-loyalty-discount-percent")]
        public ActionResult<double> CalculateLoyaltyDiscountPercent([FromBody] CalculateLoyaltyDiscountPercentRequest request)
        {
            var result = LoyaltyLogic.CalculateLoyaltyDiscountPercent(request.yearsAsCustomer, request.onTimePaymentCount);
            return Ok(result);
        }

        [HttpPost("is-vip-eligible")]
        public ActionResult<bool> IsVipEligible([FromBody] IsVipEligibleRequest request)
        {
            var result = LoyaltyLogic.IsVipEligible(request.yearsAsCustomer, request.averageMonthlyBillAmount);
            return Ok(result);
        }

        [HttpPost("reward-points-for-usage")]
        public ActionResult<int> RewardPointsForUsage([FromBody] RewardPointsForUsageRequest request)
        {
            var result = LoyaltyLogic.RewardPointsForUsage(request.usageKWh);
            return Ok(result);
        }

        [HttpPost("apply-loyalty-discount")]
        public ActionResult<double> ApplyLoyaltyDiscount([FromBody] ApplyLoyaltyDiscountRequest request)
        {
            var result = LoyaltyLogic.ApplyLoyaltyDiscount(request.amount, request.discountPercent);
            return Ok(result);
        }
    }
}


