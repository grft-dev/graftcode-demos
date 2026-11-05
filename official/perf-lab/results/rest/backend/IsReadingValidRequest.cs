namespace EnergyPriceService;

public class IsReadingValidRequest
{
    public int PreviousReadingKWh { get; set; }
    public int CurrentReadingKWh { get; set; }
    public int MaxAllowedJumpKWh { get; set; }
}
