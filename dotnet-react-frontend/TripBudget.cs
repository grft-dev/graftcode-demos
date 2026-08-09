namespace TripBudgetService;

// Use Case 1 backend — a plain C# class. No controllers, no REST routes, no OpenAPI.
// Any public method becomes remotely callable once hosted by the Graftcode Gateway,
// and installable as a typed Graft in any app (npm, NuGet, PyPI, …).
//
// Graftcode contract rules applied here:
//   - public STATIC method (stateless facade — result returns by value in one round-trip)
//   - SYNCHRONOUS (no async/Task on the public surface)
//   - simple types only (int, double) — no DateTime/Guid/collections on the signature.
//     Money is double, not decimal: JavaScript has a single number type, so a whole
//     number like 120 arrives as Int32 and the gateway won't widen Int32 -> Decimal.
//     double maps cleanly to/from a JS number, which is what every Graft caller sends.
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

    // Grafts aren't limited to primitives — a whole object crosses the boundary too.
    // In stateless mode the entire DTO arrives by value in ONE round-trip, so the
    // consumer reads its fields synchronously (no await per field).
    public static TripEstimate EstimateBreakdown(int nights, double nightlyRate, int travelers)
    {
        double lodging = nights * nightlyRate;
        double spending = nights * DailySpendPerTraveler * travelers;
        return new TripEstimate
        {
            Lodging = lodging,
            Spending = spending,
            Total = lodging + spending,
            Summary = $"{nights} nights for {travelers} traveler(s)"
        };
    }
}

// A plain DTO: primitives + strings only, so it maps cleanly into every
// consuming language. No DateTime, no List<T>, no framework types.
public class TripEstimate
{
    public double Lodging { get; set; }
    public double Spending { get; set; }
    public double Total { get; set; }
    public string Summary { get; set; } = "";
}
