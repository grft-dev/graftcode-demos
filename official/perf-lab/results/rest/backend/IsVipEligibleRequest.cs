namespace EnergyPriceService;

public class IsVipEligibleRequest
{
    public int YearsAsCustomer { get; set; }
    public double AverageMonthlyBillAmount { get; set; }
}
