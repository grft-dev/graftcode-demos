namespace EnergyPriceService;

public class DetermineTierRequest
{
    public double UsageKWh { get; set; }
    public double Tier1ThresholdKWh { get; set; }
    public double Tier2ThresholdKWh { get; set; }
}
