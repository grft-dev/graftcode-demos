namespace EnergyPriceService;

public class DetermineTierRequest
{
    public double usageKWh { get; set; }
    public double tier1ThresholdKWh { get; set; }
    public double tier2ThresholdKWh { get; set; }
}

public class CalculateTieredCostRequest
{
    public double usageKWh { get; set; }
    public double baseRate { get; set; }
    public double tier1ThresholdKWh { get; set; }
    public double tier1Rate { get; set; }
    public double tier2ThresholdKWh { get; set; }
    public double tier2Rate { get; set; }
    public double tier3Rate { get; set; }
}

public class ApplyTimeOfUseAdjustmentRequest
{
    public double baseAmount { get; set; }
    public int peakHoursUsed { get; set; }
    public int offPeakHoursUsed { get; set; }
    public double peakMultiplier { get; set; }
    public double offPeakMultiplier { get; set; }
}


