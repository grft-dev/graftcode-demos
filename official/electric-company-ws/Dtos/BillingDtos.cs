namespace EnergyPriceService;

public class CalculateMonthlyBillRequest
{
    public double usageKWh { get; set; }
    public double baseRatePerKWh { get; set; }
    public double taxRatePercent { get; set; }
}

public class ApplyLateFeeRequest
{
    public double currentAmount { get; set; }
    public int daysLate { get; set; }
    public double dailyRatePercent { get; set; }
}

public class CalculateTaxRequest
{
    public double amount { get; set; }
    public double taxRatePercent { get; set; }
}

public class IsBudgetBillingEligibleRequest
{
    public double averageMonthlyUsageKWh { get; set; }
    public double thresholdKWh { get; set; }
}


