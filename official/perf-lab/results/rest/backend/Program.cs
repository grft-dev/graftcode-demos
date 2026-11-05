using EnergyPriceService;
using EnergyPriceService.Dtos;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

app.MapPost("/api/calculate-monthly-bill", (CalculateMonthlyBillRequest request) =>
{
    var total = BillingLogic.CalculateMonthlyBill(
        request.UsageKWh, request.BaseRatePerKWh, request.TaxRatePercent);
    return Results.Ok(new CalculateMonthlyBillResponse { Total = total });
});

app.MapPost("/api/apply-late-fee", (ApplyLateFeeRequest request) =>
{
    var amount = BillingLogic.ApplyLateFee(
        request.CurrentAmount, request.DaysLate, request.DailyRatePercent);
    return Results.Ok(new ApplyLateFeeResponse { Amount = amount });
});

app.MapPost("/api/calculate-tax", (CalculateTaxRequest request) =>
{
    var tax = BillingLogic.CalculateTax(request.Amount, request.TaxRatePercent);
    return Results.Ok(new CalculateTaxResponse { Tax = tax });
});

app.MapPost("/api/is-budget-billing-eligible", (IsBudgetBillingEligibleRequest request) =>
{
    var eligible = BillingLogic.IsBudgetBillingEligible(
        request.AverageMonthlyUsageKWh, request.ThresholdKWh);
    return Results.Ok(new IsBudgetBillingEligibleResponse { Eligible = eligible });
});

app.MapPost("/api/net-consumption-kwh", (NetConsumptionKWhRequest request) =>
{
    var net = MeterLogic.NetConsumptionKWh(
        request.PreviousReadingKWh, request.CurrentReadingKWh);
    return Results.Ok(new NetConsumptionKWhResponse { NetConsumptionKWh = net });
});

app.MapPost("/api/is-reading-valid", (IsReadingValidRequest request) =>
{
    var valid = MeterLogic.IsReadingValid(
        request.PreviousReadingKWh, request.CurrentReadingKWh, request.MaxAllowedJumpKWh);
    return Results.Ok(new IsReadingValidResponse { Valid = valid });
});

app.MapPost("/api/estimate-average-daily-usage", (EstimateAverageDailyUsageRequest request) =>
{
    var average = MeterLogic.EstimateAverageDailyUsage(request.UsageKWh, request.Days);
    return Results.Ok(new EstimateAverageDailyUsageResponse { AverageDailyUsage = average });
});

app.MapPost("/api/project-next-cycle-usage-kwh", (ProjectNextCycleUsageKWhRequest request) =>
{
    var projected = MeterLogic.ProjectNextCycleUsageKWh(
        request.RecentAvgDailyKWh, request.DaysInCycle);
    return Results.Ok(new ProjectNextCycleUsageKWhResponse { ProjectedUsageKWh = projected });
});

app.MapPost("/api/determine-tier", (DetermineTierRequest request) =>
{
    var tier = TariffLogic.DetermineTier(
        request.UsageKWh, request.Tier1ThresholdKWh, request.Tier2ThresholdKWh);
    return Results.Ok(new DetermineTierResponse { Tier = tier });
});

app.MapPost("/api/calculate-tiered-cost", (CalculateTieredCostRequest request) =>
{
    var cost = TariffLogic.CalculateTieredCost(
        request.UsageKWh,
        request.BaseRate,
        request.Tier1ThresholdKWh,
        request.Tier1Rate,
        request.Tier2ThresholdKWh,
        request.Tier2Rate,
        request.Tier3Rate);
    return Results.Ok(new CalculateTieredCostResponse { Cost = cost });
});

app.MapPost("/api/apply-time-of-use-adjustment", (ApplyTimeOfUseAdjustmentRequest request) =>
{
    var adjusted = TariffLogic.ApplyTimeOfUseAdjustment(
        request.BaseAmount,
        request.PeakHoursUsed,
        request.OffPeakHoursUsed,
        request.PeakMultiplier,
        request.OffPeakMultiplier);
    return Results.Ok(new ApplyTimeOfUseAdjustmentResponse { AdjustedAmount = adjusted });
});

app.MapPost("/api/is-rebate-eligible", (IsRebateEligibleRequest request) =>
{
    var eligible = OutageLogic.IsRebateEligible(
        request.OutageMinutes, request.EligibilityThresholdMinutes);
    return Results.Ok(new IsRebateEligibleResponse { Eligible = eligible });
});

app.MapPost("/api/calculate-outage-rebate", (CalculateOutageRebateRequest request) =>
{
    var rebate = OutageLogic.CalculateOutageRebate(
        request.MonthlyBillAmount,
        request.OutageMinutes,
        request.MinutesPerCredit,
        request.CreditPerUnit);
    return Results.Ok(new CalculateOutageRebateResponse { Rebate = rebate });
});

app.MapPost("/api/estimate-restoration-time-minutes", (EstimateRestorationTimeMinutesRequest request) =>
{
    var minutes = OutageLogic.EstimateRestorationTimeMinutes(
        request.BaseRepairMinutes, request.CrewCount, request.SeverityLevel);
    return Results.Ok(new EstimateRestorationTimeMinutesResponse { RestorationTimeMinutes = minutes });
});

app.MapPost("/api/calculate-loyalty-discount-percent", (CalculateLoyaltyDiscountPercentRequest request) =>
{
    var discountPercent = LoyaltyLogic.CalculateLoyaltyDiscountPercent(
        request.YearsAsCustomer, request.OnTimePaymentCount);
    return Results.Ok(new CalculateLoyaltyDiscountPercentResponse { DiscountPercent = discountPercent });
});

app.MapPost("/api/is-vip-eligible", (IsVipEligibleRequest request) =>
{
    var eligible = LoyaltyLogic.IsVipEligible(
        request.YearsAsCustomer, request.AverageMonthlyBillAmount);
    return Results.Ok(new IsVipEligibleResponse { Eligible = eligible });
});

app.MapPost("/api/reward-points-for-usage", (RewardPointsForUsageRequest request) =>
{
    var points = LoyaltyLogic.RewardPointsForUsage(request.UsageKWh);
    return Results.Ok(new RewardPointsForUsageResponse { Points = points });
});

app.MapPost("/api/apply-loyalty-discount", (ApplyLoyaltyDiscountRequest request) =>
{
    var discounted = LoyaltyLogic.ApplyLoyaltyDiscount(request.Amount, request.DiscountPercent);
    return Results.Ok(new ApplyLoyaltyDiscountResponse { DiscountedAmount = discounted });
});

app.MapPost("/api/get-price", (GetPriceRequest _) =>
{
    var price = EnergyPriceService.EnergyPriceService.GetPrice();
    return Results.Ok(new GetPriceResponse { Price = price });
});

app.MapPost("/api/get-price-history", (GetPriceHistoryRequest request) =>
{
    var points = EnergyPriceService.EnergyPriceService.GetPriceHistory(request.Count);
    return Results.Ok(new GetPriceHistoryResponse { PricePoints = points });
});

app.Run();
