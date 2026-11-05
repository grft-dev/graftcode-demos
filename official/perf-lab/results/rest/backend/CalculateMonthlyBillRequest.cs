namespace EnergyPriceService;

public class CalculateMonthlyBillRequest
{
    public double UsageKWh { get; set; }
    public double BaseRatePerKWh { get; set; }
    public double TaxRatePercent { get; set; }
}
