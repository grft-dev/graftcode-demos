namespace EnergyPriceService;

public class NetConsumptionKWhRequest
{
    public int PreviousReadingKWh { get; set; }
    public int CurrentReadingKWh { get; set; }
}
