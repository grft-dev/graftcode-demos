from mcp.server.fastmcp import FastMCP
from energy_price_calculator import EnergyPriceCalculator

# Initialize the FastMCP server
mcp = FastMCP("Energy Price MCP")

@mcp.tool()
def get_current_price() -> float:
    """
    Get the current energy price. 
    Returns the price in EUR/kWh.
    """
    return float(EnergyPriceCalculator.get_price())

@mcp.tool()
def calculate_bill(kwh_used: float) -> float:
    """
    Calculate the total energy bill based on the provided kWh usage.
    Returns the total bill amount in EUR.
    """
    return float(EnergyPriceCalculator.calculate_bill(kwh_used))

if __name__ == "__main__":
    # Runs the MCP server using standard I/O (which is how Claude Desktop communicates with it)
    mcp.run()
