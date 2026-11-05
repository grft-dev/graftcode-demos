namespace EnergyPriceService;

public class EstimateRestorationTimeMinutesRequest
{
    public int BaseRepairMinutes { get; set; }
    public int CrewCount { get; set; }
    public int SeverityLevel { get; set; }
}
