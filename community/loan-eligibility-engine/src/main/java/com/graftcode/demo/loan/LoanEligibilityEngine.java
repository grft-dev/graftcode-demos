package com.graftcode.demo.loan;

/**
 * Loan Eligibility Engine — the single class exposed by the Graftcode Gateway.
 *
 * <p>Every public method is discovered automatically and callable remotely. No Spring Boot,
 * no REST controllers, no OpenAPI spec required.
 *
 * <p>Business rules:
 * <ul>
 *   <li>Minimum annual income: $20,000.</li>
 *   <li>Minimum credit score: 600.</li>
 *   <li>Minimum working history: 1 year.</li>
 *   <li>Maximum debt-to-income ratio (existing debt / annual income): 43%.</li>
 * </ul>
 */
public class LoanEligibilityEngine {

    private static final double MIN_ANNUAL_INCOME = 20_000.0;
    private static final int    MIN_CREDIT_SCORE  = 600;
    private static final int    MIN_WORKING_YEARS = 1;

    /** Risk band ceilings. LOW and MEDIUM are exclusive; MAX_DTI is inclusive. */
    private static final double LOW_DTI    = 0.20;
    private static final double MEDIUM_DTI = 0.36;
    private static final double MAX_DTI    = 0.43;

    /**
     * 1. Loan eligibility evaluation.
     *
     * <p>Runs the checks in order — income, credit score, working years, then debt-to-income
     * ratio — and returns the first failure, or the approved result with its risk level.
     *
     * @param applicantName   display name of the applicant; not part of the decision
     * @param annualIncome    gross annual income
     * @param workingYears    years of working history
     * @param preExistingDebt total existing debt
     * @param creditScore     credit score, minimum {@value #MIN_CREDIT_SCORE}
     * @return the eligibility result as human-readable text
     */
    public String evaluateLoan(String applicantName, double annualIncome, int workingYears,
                               double preExistingDebt, int creditScore) {

        String problem = incomeProblem(annualIncome);
        if (problem != null) {
            return "NOT ELIGIBLE - " + problem;
        }

        problem = creditScoreProblem(creditScore);
        if (problem != null) {
            return "NOT ELIGIBLE - " + problem;
        }

        problem = workingYearsProblem(workingYears);
        if (problem != null) {
            return "NOT ELIGIBLE - " + problem;
        }

        double debtToIncomeRatio = calculateDebtToIncomeRatio(annualIncome, preExistingDebt);
        if (debtToIncomeRatio > MAX_DTI) {
            return String.format(
                "NOT ELIGIBLE - debt-to-income ratio %.1f%% exceeds the maximum of %.0f%%.",
                debtToIncomeRatio * 100, MAX_DTI * 100);
        }

        String riskLevel = projectRiskLevel(debtToIncomeRatio);
        return String.format(
            "ELIGIBLE - risk %s (debt-to-income ratio %.1f%%). %s",
            riskLevel, debtToIncomeRatio * 100, projectSeverityOfRisk(riskLevel));
    }

    /**
     * 2. Credit score validation.
     *
     * @param creditScore the credit score to validate
     * @return {@code ELIGIBLE - ...} or {@code NOT ELIGIBLE - ...} with the reason
     */
    public String validateCreditScore(int creditScore) {
        String problem = creditScoreProblem(creditScore);
        return problem == null
            ? String.format("ELIGIBLE - credit score %d meets the minimum of %d.", creditScore, MIN_CREDIT_SCORE)
            : "NOT ELIGIBLE - " + problem;
    }

    /**
     * 3. Debt-to-income ratio calculation.
     *
     * <p>Returns {@code 0.0} when {@code annualIncome} is not positive; the loan evaluation
     * rejects such an application with the income reason. The guard keeps the ratio finite, since
     * neither {@code Infinity} nor {@code NaN} can be represented in a JSON response.
     *
     * @param annualIncome    gross annual income
     * @param preExistingDebt total existing debt
     * @return existing debt divided by annual income (0.43 = 43%)
     */
    public double calculateDebtToIncomeRatio(double annualIncome, double preExistingDebt) {
        if (annualIncome <= 0) {
            return 0.0;
        }
        return preExistingDebt / annualIncome;
    }

    // ------------------------------------------------------------------
    // Rule checks — the single source of truth for each failure message.
    // They return the reason, or null when the value passes.
    // ------------------------------------------------------------------

    private static String incomeProblem(double annualIncome) {
        if (annualIncome < MIN_ANNUAL_INCOME) {
            return String.format(
                "annual income $%.2f is below the minimum of $%.2f.", annualIncome, MIN_ANNUAL_INCOME);
        }
        return null;
    }

    private static String creditScoreProblem(int creditScore) {
        if (creditScore < MIN_CREDIT_SCORE) {
            return String.format(
                "credit score %d is below the minimum of %d.", creditScore, MIN_CREDIT_SCORE);
        }
        return null;
    }

    private static String workingYearsProblem(int workingYears) {
        if (workingYears < MIN_WORKING_YEARS) {
            return String.format(
                "%d working year(s) is below the minimum of %d.", workingYears, MIN_WORKING_YEARS);
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Risk projection — internal to the engine, so only the three public
    // methods above appear in Graftcode Vision.
    // ------------------------------------------------------------------

    private static String projectRiskLevel(double debtToIncomeRatio) {
        if (debtToIncomeRatio < LOW_DTI)    return "LOW";
        if (debtToIncomeRatio < MEDIUM_DTI) return "MEDIUM";
        return "HIGH";
    }

    private static String projectSeverityOfRisk(String riskLevel) {
        return switch (riskLevel) {
            case "LOW"    -> "Minimal severity - risk is well within acceptable limits.";
            case "MEDIUM" -> "Moderate severity - risk requires standard monitoring.";
            default       -> "Substantial severity - risk is near the acceptable limit.";
        };
    }
}
