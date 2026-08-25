// Trip cost estimator — plain business logic.
// The rate table is module-private on purpose: it is internal pricing data.

const NIGHTLY_RATES = {
  lisbon: 95,
  tokyo: 140,
  "mexico-city": 70,
  reykjavik: 165,
};
const DAILY_SPEND_PER_TRAVELER = 75; // meals, transit, activities

class TripBudget {
  /**
   * Look up the nightly lodging rate for a city (falls back to a default).
   * @param {string} city
   * @returns {number}
   */
  static getNightlyRate(city) {
    return NIGHTLY_RATES[city.toLowerCase()] ?? 110;
  }

  /**
   * Estimate the all-in cost of a trip.
   * @param {string} city
   * @param {number} nights
   * @param {number} travelers
   * @returns {number}
   */
  static estimateTotal(city, nights, travelers) {
    const lodging = TripBudget.getNightlyRate(city) * nights;
    const spending = DAILY_SPEND_PER_TRAVELER * nights * travelers;
    return lodging + spending;
  }
}

module.exports = { TripBudget };
