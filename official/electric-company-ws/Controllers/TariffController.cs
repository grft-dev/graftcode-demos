using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TariffController : ControllerBase
    {
        [HttpPost("determine-tier")]
        public ActionResult<int> DetermineTier([FromBody] DetermineTierRequest request)
        {
            var result = TariffLogic.DetermineTier(request.usageKWh, request.tier1ThresholdKWh, request.tier2ThresholdKWh);
            return Ok(result);
        }

        [HttpPost("calculate-tiered-cost")]
        public ActionResult<double> CalculateTieredCost([FromBody] CalculateTieredCostRequest request)
        {
            var result = TariffLogic.CalculateTieredCost(
                request.usageKWh,
                request.baseRate,
                request.tier1ThresholdKWh,
                request.tier1Rate,
                request.tier2ThresholdKWh,
                request.tier2Rate,
                request.tier3Rate
            );
            return Ok(result);
        }

        [HttpPost("apply-time-of-use-adjustment")]
        public ActionResult<double> ApplyTimeOfUseAdjustment([FromBody] ApplyTimeOfUseAdjustmentRequest request)
        {
            var result = TariffLogic.ApplyTimeOfUseAdjustment(
                request.baseAmount,
                request.peakHoursUsed,
                request.offPeakHoursUsed,
                request.peakMultiplier,
                request.offPeakMultiplier
            );
            return Ok(result);
        }
    }
}


