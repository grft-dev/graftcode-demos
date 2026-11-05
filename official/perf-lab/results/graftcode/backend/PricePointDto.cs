namespace EnergyPriceService.Dtos;

// Same shape as REST (electric-company-ws) and gRPC PricePoint for fair large-payload comparison.
public class PricePointDto
{
    public long Timestamp { get; set; }
    public double Price { get; set; }
    public double Low { get; set; }
    public double High { get; set; }
    public double Average { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Region { get; set; } = "EU-Central";
    public string Source { get; set; } = "";
}
