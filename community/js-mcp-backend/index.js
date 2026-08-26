// Use Case 2 — plain JS module exposed as MCP tools by the Graftcode Gateway.
// No decorators, no framework, nothing MCP-specific. Public static methods
// become callable MCP tools automatically once hosted by the gateway.
//
// Graftcode contract rules applied here:
//   - public STATIC methods (stateless facade)
//   - simple types only (string, number) — no Map/Set/streams on the signature
//   - the private rate table stays internal, so it is NOT exposed as a tool
//   - JSDoc @param/@returns: plain JS has no types, so without these the analyzer
//     infers `object` and the typed (npm) Graft can't be downloaded. JSDoc tells it
//     these are string/number. (MCP tool-calling works either way; this is only for
//     the downloadable typed package — the app-to-app path.)

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
