package com.graftcode.demo.loan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests for the three public methods of {@link LoanEligibilityEngine}.
 *
 * <p>Assertions compare the complete returned string, so the message wording and the formatted
 * debt-to-income ratio are covered as well.
 *
 * <p>The boundary tests pin the threshold semantics: LOW is exclusive at 20%, MEDIUM is exclusive
 * at 36%, and the 43% debt-to-income maximum, the $20,000 income minimum, the 1 working year
 * minimum and the 600 minimum credit score are all inclusive.
 */
@DisplayName("LoanEligibilityEngine")
class LoanEligibilityEngineTest {

    private static final String APPLICANT = "Jane Smith";

    private LoanEligibilityEngine engine;

    @BeforeEach
    void setUp() {
        engine = new LoanEligibilityEngine();
    }

    private void assertEligibility(String expected, double income, int years, double debt, int creditScore) {
        assertEquals(expected, engine.evaluateLoan(APPLICANT, income, years, debt, creditScore));
    }

    // ------------------------------------------------------------------
    // 1. evaluateLoan — eligible, by risk band
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Low risk — $120k income, 5 years, $12k debt, score 700 (DTI 10%)")
    void testLowRisk() {
        assertEligibility(
            "ELIGIBLE - risk LOW (debt-to-income ratio 10.0%). Minimal severity - risk is well within acceptable limits.",
            120_000, 5, 12_000, 700);
    }

    @Test
    @DisplayName("Medium risk — $80k income, $24k debt, score 700 (DTI 30%)")
    void testMediumRisk() {
        assertEligibility(
            "ELIGIBLE - risk MEDIUM (debt-to-income ratio 30.0%). Moderate severity - risk requires standard monitoring.",
            80_000, 3, 24_000, 700);
    }

    @Test
    @DisplayName("High risk — $80k income, $32k debt, score 700 (DTI 40%)")
    void testHighRisk() {
        assertEligibility(
            "ELIGIBLE - risk HIGH (debt-to-income ratio 40.0%). Substantial severity - risk is near the acceptable limit.",
            80_000, 2, 32_000, 700);
    }

    // ------------------------------------------------------------------
    // 1. evaluateLoan — declined
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Declined — $40k debt on $80k income, score 700 (DTI 50%)")
    void testHighDebtDeclined() {
        assertEligibility(
            "NOT ELIGIBLE - debt-to-income ratio 50.0% exceeds the maximum of 43%.",
            80_000, 4, 40_000, 700);
    }

    @Test
    @DisplayName("Declined — income below the $20k minimum")
    void testInsufficientIncome() {
        assertEligibility(
            "NOT ELIGIBLE - annual income $15000.00 is below the minimum of $20000.00.",
            15_000, 4, 1_000, 700);
    }

    @Test
    @DisplayName("Declined — credit score below the 600 minimum")
    void testInsufficientCreditScore() {
        assertEligibility(
            "NOT ELIGIBLE - credit score 599 is below the minimum of 600.",
            60_000, 3, 1_000, 599);
    }

    @Test
    @DisplayName("Declined — no working history")
    void testInsufficientWorkingYears() {
        assertEligibility(
            "NOT ELIGIBLE - 0 working year(s) is below the minimum of 1.",
            60_000, 0, 1_000, 700);
    }

    @Test
    @DisplayName("Declined — income is reported before the credit score")
    void testIncomeIsCheckedBeforeCreditScore() {
        assertEligibility(
            "NOT ELIGIBLE - annual income $15000.00 is below the minimum of $20000.00.",
            15_000, 3, 1_000, 500);
    }

    @Test
    @DisplayName("Declined — the credit score is reported before the working years")
    void testCreditScoreIsCheckedBeforeWorkingYears() {
        assertEligibility(
            "NOT ELIGIBLE - credit score 500 is below the minimum of 600.",
            60_000, 0, 1_000, 500);
    }

    // ------------------------------------------------------------------
    // 1. evaluateLoan — boundaries
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Boundary — DTI exactly 43% is still accepted (HIGH)")
    void testDtiAtMaximumIsAccepted() {
        assertEligibility(
            "ELIGIBLE - risk HIGH (debt-to-income ratio 43.0%). Substantial severity - risk is near the acceptable limit.",
            100_000, 3, 43_000, 700);
    }

    @Test
    @DisplayName("Boundary — DTI 44% is over the maximum")
    void testDtiAboveMaximumIsDeclined() {
        assertEligibility(
            "NOT ELIGIBLE - debt-to-income ratio 44.0% exceeds the maximum of 43%.",
            100_000, 3, 44_000, 700);
    }

    @Test
    @DisplayName("Boundary — DTI 19.9% is LOW")
    void testDtiBelowLowThreshold() {
        assertEligibility(
            "ELIGIBLE - risk LOW (debt-to-income ratio 19.9%). Minimal severity - risk is well within acceptable limits.",
            100_000, 3, 19_900, 700);
    }

    @Test
    @DisplayName("Boundary — DTI exactly 20% is MEDIUM (LOW is exclusive)")
    void testDtiAtLowThresholdIsMedium() {
        assertEligibility(
            "ELIGIBLE - risk MEDIUM (debt-to-income ratio 20.0%). Moderate severity - risk requires standard monitoring.",
            100_000, 3, 20_000, 700);
    }

    @Test
    @DisplayName("Boundary — DTI 35.9% is MEDIUM")
    void testDtiBelowMediumThreshold() {
        assertEligibility(
            "ELIGIBLE - risk MEDIUM (debt-to-income ratio 35.9%). Moderate severity - risk requires standard monitoring.",
            100_000, 3, 35_900, 700);
    }

    @Test
    @DisplayName("Boundary — DTI exactly 36% is HIGH (MEDIUM is exclusive)")
    void testDtiAtMediumThresholdIsHigh() {
        assertEligibility(
            "ELIGIBLE - risk HIGH (debt-to-income ratio 36.0%). Substantial severity - risk is near the acceptable limit.",
            100_000, 3, 36_000, 700);
    }

    @Test
    @DisplayName("Boundary — credit score exactly 600 is accepted")
    void testCreditScoreAtMinimumIsAccepted() {
        assertEligibility(
            "ELIGIBLE - risk LOW (debt-to-income ratio 10.0%). Minimal severity - risk is well within acceptable limits.",
            120_000, 5, 12_000, 600);
    }

    @Test
    @DisplayName("Boundary — annual income exactly $20k is accepted (minimum is inclusive)")
    void testIncomeAtMinimumIsAccepted() {
        assertEligibility(
            "ELIGIBLE - risk LOW (debt-to-income ratio 5.0%). Minimal severity - risk is well within acceptable limits.",
            20_000, 3, 1_000, 700);
    }

    @Test
    @DisplayName("Boundary — exactly 1 working year is accepted (minimum is inclusive)")
    void testWorkingYearsAtMinimumIsAccepted() {
        assertEligibility(
            "ELIGIBLE - risk LOW (debt-to-income ratio 1.7%). Minimal severity - risk is well within acceptable limits.",
            60_000, 1, 1_000, 700);
    }

    // ------------------------------------------------------------------
    // 2. validateCreditScore
    // ------------------------------------------------------------------

    @Test
    @DisplayName("validateCreditScore — 600 passes")
    void testValidateCreditScore() {
        assertEquals("ELIGIBLE - credit score 600 meets the minimum of 600.", engine.validateCreditScore(600));
    }

    @Test
    @DisplayName("validateCreditScore — 599 fails")
    void testValidateCreditScoreBelowMinimum() {
        assertEquals("NOT ELIGIBLE - credit score 599 is below the minimum of 600.", engine.validateCreditScore(599));
    }

    // ------------------------------------------------------------------
    // 3. calculateDebtToIncomeRatio
    // ------------------------------------------------------------------

    @Test
    @DisplayName("calculateDebtToIncomeRatio — $24k of $80k is 0.30")
    void testCalculateDebtToIncomeRatio() {
        assertEquals(0.30, engine.calculateDebtToIncomeRatio(80_000, 24_000), 0.000_001);
    }

    @Test
    @DisplayName("calculateDebtToIncomeRatio — no debt is 0.0")
    void testCalculateDebtToIncomeRatioWithoutDebt() {
        assertEquals(0.0, engine.calculateDebtToIncomeRatio(80_000, 0), 0.000_001);
    }

    @Test
    @DisplayName("calculateDebtToIncomeRatio — non-positive income is guarded to 0.0")
    void testCalculateDebtToIncomeRatioGuardsNonPositiveIncome() {
        assertEquals(0.0, engine.calculateDebtToIncomeRatio(0, 5_000), 0.000_001);
    }
}
