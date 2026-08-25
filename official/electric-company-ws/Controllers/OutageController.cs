using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OutageController : ControllerBase
    {
        [HttpPost("is-rebate-eligible")]
        public ActionResult<bool> IsRebateEligible([FromBody] IsRebateEligibleRequest request)
        {
            var result = OutageLogic.IsRebateEligible(request.outageMinutes, request.eligibilityThresholdMinutes);
            return Ok(result);
        }

        [HttpPost("calculate-outage-rebate")]
        public ActionResult<double> CalculateOutageRebate([FromBody] CalculateOutageRebateRequest request)
        {
            var result = OutageLogic.CalculateOutageRebate(request.monthlyBillAmount, request.outageMinutes, request.minutesPerCredit, request.creditPerUnit);
            return Ok(result);
        }

        [HttpPost("estimate-restoration-time")]
        public ActionResult<int> EstimateRestorationTimeMinutes([FromBody] EstimateRestorationTimeRequest request)
        {
            var result = OutageLogic.EstimateRestorationTimeMinutes(request.baseRepairMinutes, request.crewCount, request.severityLevel);
            return Ok(result);
        }
    }
}


