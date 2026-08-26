using Microsoft.AspNetCore.Mvc;
using EnergyPriceService.Dtos;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnergyPriceController : ControllerBase
    {
        private const long MinuteMs = 60_000;

        [HttpGet("price")]
        public ActionResult<double> GetPrice()
        {
            var result = EnergyPriceService.GetPrice();
            return Ok(result);
        }

        // Large-payload counterpart of gRPC GetPriceHistory: returns `count`
        // price points as a JSON array, so REST vs gRPC carries the same data.
        [HttpGet("history")]
        public ActionResult<IEnumerable<PricePointDto>> GetHistory([FromQuery] int count = 1000)
        {
            if (count <= 0) count = 1;
            if (count > 200_000) count = 200_000;

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var points = new List<PricePointDto>(count);
            for (var i = 0; i < count; i++)
            {
                var price = (double)Random.Shared.Next(1, 998);
                points.Add(new PricePointDto
                {
                    Timestamp = now - (long)i * MinuteMs,
                    Price = price,
                    Low = price * 0.9,
                    High = price * 1.1,
                    Average = price,
                    Currency = "EUR",
                    Region = "EU-Central",
                    Source = $"grid-meter-{i % 64}",
                });
            }
            return Ok(points);
        }
    }
}
