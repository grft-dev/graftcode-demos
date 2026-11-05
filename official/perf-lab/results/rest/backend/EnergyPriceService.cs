using EnergyPriceService.Dtos;

namespace EnergyPriceService;

public class EnergyPriceService
{
    private const long MinuteMs = 60_000;

    public static double GetPrice()
    {
        return Random.Shared.Next(1, 998);
    }

    public static PricePointDto[] GetPriceHistory(int count)
    {
        if (count <= 0) count = 1;
        if (count > 200_000) count = 200_000;

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var result = new PricePointDto[count];
        for (var i = 0; i < count; i++)
        {
            var price = (double)Random.Shared.Next(1, 998);
            result[i] = new PricePointDto
            {
                Timestamp = now - (long)i * MinuteMs,
                Price = price,
                Low = price * 0.9,
                High = price * 1.1,
                Average = price,
                Currency = "EUR",
                Region = "EU-Central",
                Source = $"grid-meter-{i % 64}",
            };
        }
        return result;
    }
}
