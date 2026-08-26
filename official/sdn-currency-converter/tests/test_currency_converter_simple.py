"""
Tests for the simplified currency_converter_simple module.
"""

import sys
import unittest
from pathlib import Path

# Add the parent directory to sys.path BEFORE importing the package
parent_dir = str(Path(__file__).resolve().parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Now import the class
from currency_converter.converter import SimpleCurrencyConverter


class TestSimpleCurrencyConverter(unittest.TestCase):
    """Test cases for the SimpleCurrencyConverter class."""

    # Use class attributes for rates to avoid recalculating/magic numbers
    EUR_PLN = 4.26056
    PLN_EUR = 1 / EUR_PLN
    EUR_USD = 1.085
    USD_EUR = 1 / EUR_USD

    def test_convert_valid_pairs(self):
        """Test conversion for supported currency pairs."""
        # EUR -> PLN
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "EUR", "PLN"),
            100 * self.EUR_PLN,
            places=5,
        )
        # PLN -> EUR
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "PLN", "EUR"),
            100 * self.PLN_EUR,
            places=5,
        )
        # EUR -> USD
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "EUR", "USD"),
            100 * self.EUR_USD,
            places=5,
        )
        # USD -> EUR
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "USD", "EUR"),
            100 * self.USD_EUR,
            places=5,
        )

    def test_convert_same_currency(self):
        """Test conversion when source and target currency are the same."""
        self.assertEqual(SimpleCurrencyConverter.convert(100, "USD", "USD"), 100.0)
        self.assertEqual(SimpleCurrencyConverter.convert(50, "EUR", "EUR"), 50.0)
        self.assertEqual(SimpleCurrencyConverter.convert(25.5, "PLN", "PLN"), 25.5)

    def test_convert_case_insensitive(self):
        """Test that currency codes are case-insensitive."""
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "eur", "pln"),
            100 * self.EUR_PLN,
            places=5,
        )
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "PlN", "eUr"),
            100 * self.PLN_EUR,
            places=5,
        )
        self.assertAlmostEqual(
            SimpleCurrencyConverter.convert(100, "UsD", "EUR"),
            100 * self.USD_EUR,
            places=5,
        )

    def test_convert_negative_amount(self):
        """Test conversion with a negative amount raises ValueError."""
        with self.assertRaisesRegex(ValueError, "Amount must be a positive number"):
            SimpleCurrencyConverter.convert(-100, "EUR", "PLN")

    def test_convert_unsupported_currency(self):
        """Test conversion with unsupported codes raises ValueError."""
        with self.assertRaisesRegex(ValueError, "Unsupported source currency: GBP"):
            SimpleCurrencyConverter.convert(100, "GBP", "PLN")
        with self.assertRaisesRegex(ValueError, "Unsupported target currency: JPY"):
            SimpleCurrencyConverter.convert(100, "EUR", "JPY")
        with self.assertRaisesRegex(ValueError, "Unsupported source currency: CAD"):
            SimpleCurrencyConverter.convert(100, "CAD", "XXX")

    def test_convert_unsupported_pair(self):
        """Test conversion for unsupported pairs (PLN<->USD) raises ValueError."""
        err_msg_pln_usd = "Conversion from PLN to USD is not supported"
        with self.assertRaisesRegex(ValueError, err_msg_pln_usd):
            SimpleCurrencyConverter.convert(100, "PLN", "USD")

        err_msg_usd_pln = "Conversion from USD to PLN is not supported"
        with self.assertRaisesRegex(ValueError, err_msg_usd_pln):
            SimpleCurrencyConverter.convert(100, "USD", "PLN")


if __name__ == "__main__":
    unittest.main()
