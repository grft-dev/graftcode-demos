import random


class EnergyPriceCalculator:
    @staticmethod
    def get_price():
        return random.randint(100, 104)

    @staticmethod
    def calculate_bill(kwh_used):
        kwh_used = float(kwh_used)
        price_per_kwh = EnergyPriceCalculator.get_price()
        return kwh_used * price_per_kwh


if __name__ == "__main__":
    price = EnergyPriceCalculator.get_price()
    print(f"Current energy price: {price} EUR/kWh")
    print(f"Bill for 150 kWh: {150 * price} EUR")

