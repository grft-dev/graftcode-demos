using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MeterController : ControllerBase
    {
        [HttpPost("net-consumption")]
        public ActionResult<int> NetConsumptionKWh([FromBody] NetConsumptionRequest request)
        {
            var result = MeterLogic.NetConsumptionKWh(request.previousReadingKWh, request.currentReadingKWh);
            return Ok(result);
        }

        [HttpPost("is-reading-valid")]
        public ActionResult<bool> IsReadingValid([FromBody] IsReadingValidRequest request)
        {
            var result = MeterLogic.IsReadingValid(request.previousReadingKWh, request.currentReadingKWh, request.maxAllowedJumpKWh);
            return Ok(result);
        }

        [HttpPost("estimate-average-daily-usage")]
        public ActionResult<double> EstimateAverageDailyUsage([FromBody] EstimateAverageDailyUsageRequest request)
        {
            var result = MeterLogic.EstimateAverageDailyUsage(request.usageKWh, request.days);
            return Ok(result);
        }

        [HttpPost("project-next-cycle-usage")]
        public ActionResult<int> ProjectNextCycleUsageKWh([FromBody] ProjectNextCycleUsageRequest request)
        {
            var result = MeterLogic.ProjectNextCycleUsageKWh(request.recentAvgDailyKWh, request.daysInCycle);
            return Ok(result);
        }
    }
}


