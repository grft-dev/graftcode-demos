using Microsoft.AspNetCore.Mvc;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnergyPriceController : ControllerBase
    {
        [HttpGet("price")]
        public ActionResult<double> GetPrice()
        {
            var result = EnergyPriceService.GetPrice();
            return Ok(result);
        }

        // Large-payload counterpart of gRPC GetPriceHistory: returns `count`
        // prices as a JSON array, so REST, gRPC, and Graftcode carry the same data.
        [HttpGet("history")]
        public ActionResult<double[]> GetHistory([FromQuery] int count = 1000)
        {
            if (count <= 0) count = 1;
            if (count > 200_000) count = 200_000;

            var prices = new double[count];
            for (var i = 0; i < count; i++)
            {
                prices[i] = Random.Shared.Next(1, 998);
            }
            return Ok(prices);
        }
    }
}
