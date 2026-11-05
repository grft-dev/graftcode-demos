namespace EnergyPriceService;

public class ApplyLateFeeRequest
{
    public double CurrentAmount { get; set; }
    public int DaysLate { get; set; }
    public double DailyRatePercent { get; set; }
}
