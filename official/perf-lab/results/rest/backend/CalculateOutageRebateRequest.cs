namespace EnergyPriceService;

public class CalculateOutageRebateRequest
{
    public double MonthlyBillAmount { get; set; }
    public int OutageMinutes { get; set; }
    public int MinutesPerCredit { get; set; }
    public double CreditPerUnit { get; set; }
}
