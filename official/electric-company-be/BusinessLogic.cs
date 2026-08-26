namespace EnergyPriceService;

public static class BillingLogic
{
    public static double CalculateMonthlyBill(double usageKWh, double baseRatePerKWh, double taxRatePercent)
    {
        if (usageKWh < 0) usageKWh = 0;
        if (baseRatePerKWh < 0) baseRatePerKWh = 0;
        if (taxRatePercent < 0) taxRatePercent = 0;

        var subtotal = (double)usageKWh * baseRatePerKWh;
        var tax = subtotal * (taxRatePercent / 100.0);
        var total = subtotal + tax;
        return total < 0 ? 0 : total;
    }

    public static double ApplyLateFee(double currentAmount, int daysLate, double dailyRatePercent)
    {
        if (currentAmount <= 0 || daysLate <= 0 || dailyRatePercent <= 0) return currentAmount < 0 ? 0 : currentAmount;
        var multiplier = 1.0 + (dailyRatePercent / 100.0) * (daysLate <= 0 ? 0 : daysLate);
        var result = currentAmount * multiplier;
        return result < 0 ? 0 : result;
    }

    public static double CalculateTax(double amount, double taxRatePercent)
    {
        if (amount <= 0 || taxRatePercent <= 0) return 0;
        var tax = amount * (taxRatePercent / 100.0);
        return tax < 0 ? 0 : tax;
    }

    public static bool IsBudgetBillingEligible(double averageMonthlyUsageKWh, double thresholdKWh)
    {
        if (averageMonthlyUsageKWh < 0 || thresholdKWh < 0) return false;
        return averageMonthlyUsageKWh >= thresholdKWh;
    }
}

public static class MeterLogic
{
    public static int NetConsumptionKWh(int previousReadingKWh, int currentReadingKWh)
    {
        var diff = currentReadingKWh - previousReadingKWh;
        return diff < 0 ? 0 : diff;
    }

    public static bool IsReadingValid(int previousReadingKWh, int currentReadingKWh, int maxAllowedJumpKWh)
    {
        if (previousReadingKWh < 0 || currentReadingKWh < 0 || maxAllowedJumpKWh < 0) return false;
        if (currentReadingKWh < previousReadingKWh) return false;
        return (currentReadingKWh - previousReadingKWh) <= maxAllowedJumpKWh;
    }

    public static double EstimateAverageDailyUsage(double usageKWh, int days)
    {
        if (usageKWh <= 0 || days <= 0) return 0;
        return usageKWh / days;
    }

    public static int ProjectNextCycleUsageKWh(int recentAvgDailyKWh, int daysInCycle)
    {
        if (recentAvgDailyKWh < 0 || daysInCycle <= 0) return 0;
        var projected = recentAvgDailyKWh * daysInCycle;
        return projected < 0 ? 0 : projected;
    }
}

public static class TariffLogic
{
    public static int DetermineTier(double usageKWh, double tier1ThresholdKWh, double tier2ThresholdKWh)
    {
        if (usageKWh < 0) return 0;
        if (usageKWh <= tier1ThresholdKWh) return 1;
        if (usageKWh <= tier2ThresholdKWh) return 2;
        return 3;
    }

    public static double CalculateTieredCost(double usageKWh, double baseRate, double tier1ThresholdKWh, double tier1Rate, double tier2ThresholdKWh, double tier2Rate, double tier3Rate)
    {
        if (usageKWh <= 0) return 0;
        if (baseRate < 0 || tier1Rate < 0 || tier2Rate < 0 || tier3Rate < 0) return 0;

        double cost = 0;
        double remaining = usageKWh;

        double tier1Qty = remaining <= tier1ThresholdKWh ? remaining : tier1ThresholdKWh;
        cost += (double)tier1Qty * (baseRate + tier1Rate);
        remaining -= tier1Qty;

        if (remaining > 0)
        {
            double tier2Band = tier2ThresholdKWh - tier1ThresholdKWh;
            double tier2Qty = remaining <= tier2Band ? remaining : tier2Band;
            cost += (double)tier2Qty * (baseRate + tier2Rate);
            remaining -= tier2Qty;
        }

        if (remaining > 0)
        {
            cost += (double)remaining * (baseRate + tier3Rate);
        }

        return cost < 0 ? 0 : cost;
    }

    public static double ApplyTimeOfUseAdjustment(double baseAmount, int peakHoursUsed, int offPeakHoursUsed, double peakMultiplier, double offPeakMultiplier)
    {
        if (baseAmount <= 0) return 0;
        if (peakHoursUsed < 0 || offPeakHoursUsed < 0) return baseAmount;

        var totalHours = peakHoursUsed + offPeakHoursUsed;
        if (totalHours <= 0) return baseAmount;

        var peakPortion = (double)peakHoursUsed / totalHours;
        var offPeakPortion = (double)offPeakHoursUsed / totalHours;
        var adjusted = baseAmount * (peakPortion * peakMultiplier + offPeakPortion * offPeakMultiplier);
        return adjusted < 0 ? 0 : adjusted;
    }
}

public static class OutageLogic
{
    public static bool IsRebateEligible(int outageMinutes, int eligibilityThresholdMinutes)
    {
        if (outageMinutes < 0 || eligibilityThresholdMinutes <= 0) return false;
        return outageMinutes >= eligibilityThresholdMinutes;
    }

    public static double CalculateOutageRebate(double monthlyBillAmount, int outageMinutes, int minutesPerCredit, double creditPerUnit)
    {
        if (monthlyBillAmount <= 0 || outageMinutes <= 0 || minutesPerCredit <= 0 || creditPerUnit <= 0) return 0;
        var units = outageMinutes / minutesPerCredit;
        var rebate = units * creditPerUnit;
        if (rebate > monthlyBillAmount) rebate = monthlyBillAmount;
        return rebate < 0 ? 0 : rebate;
    }

    public static int EstimateRestorationTimeMinutes(int baseRepairMinutes, int crewCount, int severityLevel)
    {
        if (baseRepairMinutes <= 0 || crewCount <= 0 || severityLevel <= 0) return 0;
        var adjusted = (baseRepairMinutes * severityLevel) / crewCount;
        return adjusted < 0 ? 0 : adjusted;
    }
}

public static class LoyaltyLogic
{
    public static double CalculateLoyaltyDiscountPercent(int yearsAsCustomer, int onTimePaymentCount)
    {
        if (yearsAsCustomer < 0 || onTimePaymentCount < 0) return 0;
        var yearsFactor = yearsAsCustomer * 0.5;
        var paymentsFactor = onTimePaymentCount * 0.1;
        var total = yearsFactor + paymentsFactor;
        if (total > 20.0) total = 20.0;
        if (total < 0.0) total = 0.0;
        return total;
    }

    public static bool IsVipEligible(int yearsAsCustomer, double averageMonthlyBillAmount)
    {
        if (yearsAsCustomer < 0 || averageMonthlyBillAmount < 0) return false;
        return yearsAsCustomer >= 5 && averageMonthlyBillAmount >= 200.0;
    }

    public static int RewardPointsForUsage(double usageKWh)
    {
        if (usageKWh <= 0) return 0;
        var points = (int)(usageKWh / 10.0);
        return points < 0 ? 0 : points;
    }

    public static double ApplyLoyaltyDiscount(double amount, double discountPercent)
    {
        if (amount <= 0 || discountPercent <= 0) return amount < 0 ? 0 : amount;
        if (discountPercent > 100.0) discountPercent = 100.0;
        var discounted = amount * (1.0 - discountPercent / 100.0);
        return discounted < 0 ? 0 : discounted;
    }
}


