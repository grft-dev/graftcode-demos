namespace EnergyPriceService;

public class IsBudgetBillingEligibleRequest
{
    public double AverageMonthlyUsageKWh { get; set; }
    public double ThresholdKWh { get; set; }
}
