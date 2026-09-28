using Microsoft.AspNetCore.Mvc;
using EnergyPriceService.Dtos;

namespace EnergyPriceService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnergyPriceController : ControllerBase
    {
        [HttpGet("price")]
        public ActionResult<double> GetPrice()
        {
            return Ok(EnergyPriceService.GetPrice());
        }

        [HttpGet("history")]
        public ActionResult<IEnumerable<PricePointDto>> GetHistory([FromQuery] int count = 1000)
        {
            return Ok(EnergyPriceService.GetPriceHistory(count));
        }
    }
}
