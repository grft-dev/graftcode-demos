namespace EnergyPriceService;

public class NetConsumptionRequest
{
    public int previousReadingKWh { get; set; }
    public int currentReadingKWh { get; set; }
}

public class IsReadingValidRequest
{
    public int previousReadingKWh { get; set; }
    public int currentReadingKWh { get; set; }
    public int maxAllowedJumpKWh { get; set; }
}

public class EstimateAverageDailyUsageRequest
{
    public double usageKWh { get; set; }
    public int days { get; set; }
}

public class ProjectNextCycleUsageRequest
{
    public int recentAvgDailyKWh { get; set; }
    public int daysInCycle { get; set; }
}


