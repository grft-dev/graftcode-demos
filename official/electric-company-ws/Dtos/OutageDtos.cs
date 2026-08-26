namespace EnergyPriceService;

public class IsRebateEligibleRequest
{
    public int outageMinutes { get; set; }
    public int eligibilityThresholdMinutes { get; set; }
}

public class CalculateOutageRebateRequest
{
    public double monthlyBillAmount { get; set; }
    public int outageMinutes { get; set; }
    public int minutesPerCredit { get; set; }
    public double creditPerUnit { get; set; }
}

public class EstimateRestorationTimeRequest
{
    public int baseRepairMinutes { get; set; }
    public int crewCount { get; set; }
    public int severityLevel { get; set; }
}


