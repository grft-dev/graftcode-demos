using EnergyPriceService.Dtos;

namespace EnergyPriceService;

public class GetPriceHistoryResponse
{
    public PricePointDto[] PricePoints { get; set; } = [];
}
