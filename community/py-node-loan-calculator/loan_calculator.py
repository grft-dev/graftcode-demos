class LoanCalculator:
    @staticmethod
    def monthly_payment(principal: float, annual_rate_pct: float, months: int) -> float:
        if months <= 0:
            raise ValueError("months must be positive")
        if annual_rate_pct == 0:
            return round(principal / months, 2)
        monthly_rate = annual_rate_pct / 100 / 12
        factor = (1 + monthly_rate) ** months
        payment = principal * monthly_rate * factor / (factor - 1)
        return round(payment, 2)
