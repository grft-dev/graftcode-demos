namespace EnergyPriceService;

public class CalculateLoyaltyDiscountPercentRequest
{
    public int yearsAsCustomer { get; set; }
    public int onTimePaymentCount { get; set; }
}

public class IsVipEligibleRequest
{
    public int yearsAsCustomer { get; set; }
    public double averageMonthlyBillAmount { get; set; }
}

public class RewardPointsForUsageRequest
{
    public double usageKWh { get; set; }
}

public class ApplyLoyaltyDiscountRequest
{
    public double amount { get; set; }
    public double discountPercent { get; set; }
}


