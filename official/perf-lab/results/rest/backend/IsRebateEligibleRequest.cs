namespace EnergyPriceService;

public class IsRebateEligibleRequest
{
    public int OutageMinutes { get; set; }
    public int EligibilityThresholdMinutes { get; set; }
}
