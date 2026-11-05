namespace EnergyPriceService;

public class EstimateAverageDailyUsageRequest
{
    public double UsageKWh { get; set; }
    public int Days { get; set; }
}
