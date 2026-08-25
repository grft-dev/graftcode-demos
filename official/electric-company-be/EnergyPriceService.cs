namespace EnergyPriceService;

public class EnergyPriceService
{
    public static double GetPrice()
    {
        return new Random().Next(1, 998);
    }

    public static double[] GetPriceHistory(int count)
    {
        var rng = new Random();
        var result = new double[count];
        for (int i = 0; i < count; i++)
            result[i] = rng.Next(1, 998);
        return result;
    }
}
