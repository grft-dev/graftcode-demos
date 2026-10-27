import express from "express";
import { LoanCalculator, GraftConfig } from "@graft/pypi-loan-service";

GraftConfig.host = process.env.GRAFT_HOST ?? "ws://localhost/ws";
GraftConfig.stateless = true;

const PRODUCT = { name: "Laptop Pro 14", priceEUR: 1200 };
const TERM_MONTHS = 12;
const APR_PCT = 9.9;

const app = express();

app.get("/", async (req, res) => {
  const monthly = await LoanCalculator.monthlyPayment(PRODUCT.priceEUR, APR_PCT, TERM_MONTHS);
  res.send(`
    <html>
      <body style="font-family: sans-serif; max-width: 420px; margin: 4rem auto;">
        <h1>${PRODUCT.name}</h1>
        <p style="font-size: 1.5rem; margin: 0;">&euro;${PRODUCT.priceEUR}</p>
        <p style="color: #555;">
          or from <strong>&euro;${monthly.toFixed(2)}/month</strong>
          (${TERM_MONTHS} months, ${APR_PCT}% APR)
        </p>
      </body>
    </html>
  `);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`Storefront running on http://localhost:${port}`));
