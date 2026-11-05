namespace EnergyPriceService;

public class ProjectNextCycleUsageKWhRequest
{
    public int RecentAvgDailyKWh { get; set; }
    public int DaysInCycle { get; set; }
}
