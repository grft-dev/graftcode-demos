namespace EnergyPriceService;

public class CalculateLoyaltyDiscountPercentRequest
{
    public int YearsAsCustomer { get; set; }
    public int OnTimePaymentCount { get; set; }
}
