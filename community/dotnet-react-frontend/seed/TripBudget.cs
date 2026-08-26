namespace TripBudgetService;

// Trip cost estimator — plain business logic.
public class TripBudget
{
    // Flat daily spend per traveler (meals, transit, activities), in USD.
    private const double DailySpendPerTraveler = 75d;

    // Estimate the all-in cost of a trip.
    //   nights      – number of nights
    //   nightlyRate – lodging price per night (USD)
    //   travelers   – number of people
    public static double EstimateTotal(int nights, double nightlyRate, int travelers)
    {
        double lodging = nights * nightlyRate;
        double spending = nights * DailySpendPerTraveler * travelers;
        return lodging + spending;
    }
}
