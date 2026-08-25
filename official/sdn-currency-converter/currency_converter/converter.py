"""
Simplified currency conversion logic within a class.
"""


class SimpleCurrencyConverter:
    """
    Provides a simplified currency conversion using fixed rates for
    specific pairs.
    """

    # Allowed currencies for this simplified converter
    _ALLOWED_CURRENCIES = ["PLN", "EUR", "USD"]

    # Fixed rates based on approx values around 2024-04-08
    _EUR_PLN_RATE = 4.26056
    _PLN_EUR_RATE = 1 / _EUR_PLN_RATE
    _EUR_USD_RATE = 1.085
    _USD_EUR_RATE = 1 / _EUR_USD_RATE

    # Dictionary mapping supported conversion pairs to their fixed rates
    _SUPPORTED_RATES = {
        ("EUR", "PLN"): _EUR_PLN_RATE,
        ("PLN", "EUR"): _PLN_EUR_RATE,
        ("EUR", "USD"): _EUR_USD_RATE,
        ("USD", "EUR"): _USD_EUR_RATE,
    }

    @staticmethod
    def convert(amount: float, from_currency: str, to_currency: str) -> float:
        """
        Converts the given amount using fixed rates for specific pairs
        (EUR/PLN, PLN/EUR, EUR/USD, USD/EUR) based on rates around 2024-04-08.

        Args:
            amount (float): The amount to convert. Must be non-negative.
            from_currency (str): Source currency code (PLN, EUR, or USD).
            to_currency (str): Target currency code (PLN, EUR, or USD).

        Returns:
            float: The converted amount using a fixed rate for the specified pair.
                   EUR->PLN: 4.26056
                   PLN->EUR: 0.23471
                   EUR->USD: 1.085
                   USD->EUR: 0.92166

        Raises:
            ValueError: If amount is negative, currencies are not supported
                        (must be in _ALLOWED_CURRENCIES), or the requested
                        pair is not implemented (e.g. PLN->USD).
        """
        from_curr_upper = from_currency.upper()
        to_curr_upper = to_currency.upper()

        # --- Input Validation ---
        if amount < 0:
            raise ValueError("Amount must be a positive number")

        if from_curr_upper not in SimpleCurrencyConverter._ALLOWED_CURRENCIES:
            raise ValueError(f"Unsupported source currency: {from_currency}")
        if to_curr_upper not in SimpleCurrencyConverter._ALLOWED_CURRENCIES:
            raise ValueError(f"Unsupported target currency: {to_currency}")

        # --- Conversion Logic ---
        if from_curr_upper == to_curr_upper:
            return float(amount)  # No conversion needed

        pair = (from_curr_upper, to_curr_upper)
        rate = SimpleCurrencyConverter._SUPPORTED_RATES.get(pair)

        if rate is None:
            # Handle unsupported pairs (e.g., PLN <-> USD)
            raise ValueError(
                f"Conversion from {from_curr_upper} to {to_curr_upper} is not "
                f"supported in this simplified converter."
            )

        final_amount = amount * rate

        return final_amount
