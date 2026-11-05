namespace EnergyPriceService;

public class ApplyTimeOfUseAdjustmentRequest
{
    public double BaseAmount { get; set; }
    public int PeakHoursUsed { get; set; }
    public int OffPeakHoursUsed { get; set; }
    public double PeakMultiplier { get; set; }
    public double OffPeakMultiplier { get; set; }
}
