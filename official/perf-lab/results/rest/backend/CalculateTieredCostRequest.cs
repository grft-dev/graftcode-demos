namespace EnergyPriceService;

public class CalculateTieredCostRequest
{
    public double UsageKWh { get; set; }
    public double BaseRate { get; set; }
    public double Tier1ThresholdKWh { get; set; }
    public double Tier1Rate { get; set; }
    public double Tier2ThresholdKWh { get; set; }
    public double Tier2Rate { get; set; }
    public double Tier3Rate { get; set; }
}
