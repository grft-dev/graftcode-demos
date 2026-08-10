# Energy Price Calculator & MCP Server Integration

This repository contains a simple Python-based energy price calculator that has been adapted to run as a Model Context Protocol (MCP) server. This allows AI assistants like Claude to seamlessly interact with the calculator's functions natively as tools.

This example follows the [Expose MCP (Python) quick-start guide](https://academy.graftcode.com/quick-start/expose-mcp/python) on the GraftCode Academy.

- Learn more about GraftCode: [graftcode.com](https://graftcode.com)
- Sign up and explore courses: [GraftCode Academy](https://academy.graftcode.com/)
- Full quick-start guide: [academy.graftcode.com/quick-start](https://academy.graftcode.com/quick-start)

## What we did

### 1. Updated the Energy Price Calculator
- Modified `energy_price_calculator.py` by adding an `if __name__ == "__main__":` block.
- This made the script directly executable (`python3 energy_price_calculator.py`), allowing it to print out the current simulated energy price and an example bill.

### 2. Created the MCP Server
- Set up a local Python virtual environment (`venv`) to keep dependencies isolated.
- Installed the official Anthropic `mcp` SDK package (`pip install mcp`).
- Created `mcp_server.py`, which uses `FastMCP` to expose the methods of our `EnergyPriceCalculator` as accessible tools (`get_current_price` and `calculate_bill`).

### 3. Integrated with Claude Desktop
- Updated the Claude Desktop configuration file located at `~/Library/Application Support/Claude/claude_desktop_config.json`.
- Added a new `energy-calculator` entry inside the `mcpServers` block, pointing Claude to use the python interpreter inside our `venv` to run the `mcp_server.py` script.
- Safely "commented out" a pre-existing (and seemingly inactive) `energy-service` server block by prepending an underscore (`_energy-service`), which disables it without deleting the code.

## How to use

### Setup (one-time)

Create and activate a Python virtual environment, then install dependencies:

**macOS / Linux:**
```bash
cd py-ai-backend

# Create the virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install the MCP SDK (needed for the MCP server)
pip install mcp
```

**Windows (PowerShell):**
```powershell
cd py-ai-backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install mcp
```

To leave the virtual environment later, run `deactivate`.

> The `venv/` folder is ignored by git (see `.gitignore`), so each developer creates their own locally.

**Running the calculator directly:**
```bash
# Make sure the venv is activated first
python3 energy_price_calculator.py
```

**Using with Claude:**
Since the MCP server is already registered in your Claude Desktop configuration, you can simply open the Claude App and ask it questions like:
- *"What is the current energy price?"*
- *"If I use 150 kWh, how much is my bill?"* 

Claude will automatically execute the Python code locally via the MCP protocol to fetch the answer.

### Alternative Workflow: Containerized with GraftCode Gateway
Instead of running a local `mcp_server.py` file, you can achieve the exact same integration using Docker and a remote MCP gateway. See the [Expose MCP (Python) guide](https://academy.graftcode.com/quick-start/expose-mcp/python) for the full walkthrough.

1. **Start the environment:** Run your `Dockerfile` alongside the GraftCode gateway, which exposes the service on `http://localhost:81/mcp`.
2. **Update Claude Config:** In `claude_desktop_config.json`, configure the server to connect remotely via `npx` and `mcp-remote`:

```json
    "energy-service": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:81/mcp"
      ]
    }
```
This containerized approach allows Claude to access the energy price tools over the network (via the GraftCode gateway) without needing to write or maintain a separate local Python MCP server script!

### Key Differences Between the Approaches

| Feature | Local Python MCP Server (`FastMCP`) | Containerized + GraftCode Gateway |
| :--- | :--- | :--- |
| **Code Maintenance** | Requires writing & maintaining custom MCP wrapper code (e.g., `mcp_server.py`). | Zero custom MCP wrapper code required; the gateway handles the translation. |
| **Environment** | Requires managing local Python virtual environments (`venv`) and dependencies on your host machine. | Completely isolated in Docker, ensuring identical execution across any machine without local setup. |
| **Transport Layer** | Uses Standard I/O (`stdio`). Runs as a hidden background child-process tied strictly to the Claude Desktop app. | Uses HTTP/SSE via `mcp-remote`. Can be hosted anywhere (localhost or cloud) and accessed over a network. |
| **Best For** | Quick, simple local scripts and one-off tools. | Scalable, network-accessible services that need consistent deployment environments. |

### Which Approach is Better?

For a pure data service like an energy calculator, **the Containerized + Graftcode Gateway approach is the superior choice.**

* **Zero Glue Code:** You don't have to write and maintain boilerplate files like `mcp_server.py`. As your calculator grows with new functions, the Gateway handles the translation for Claude automatically.
* **Portability & Consistency:** Docker guarantees it will run exactly the same way on any machine (Mac, Windows, or Cloud) without worrying about Python versions or missing `pip` packages.
* **Scalability:** You can easily deploy the Docker container to the cloud (e.g., Azure or AWS). Once deployed, multiple users and multiple AI agents could all connect to your single source of truth over the internet!

The **Local Python Server** approach is only recommended if your AI tool explicitly needs access to your local machine (e.g., to read local files, execute local terminal commands, or interact with an app running locally). Since the energy calculator does not need local file system access, containerization is the cleaner, more professional route.
