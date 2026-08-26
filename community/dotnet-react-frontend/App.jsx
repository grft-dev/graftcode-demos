// src/App.jsx
// Use Case 1 — call your .NET TripBudget backend method from React via an
// installed Graft. No REST client, no DTOs, no OpenAPI sync.

import { useEffect, useState } from "react";
// Package name + registry come from YOUR gateway — copy the exact npm install
// command and import from the /npm route or Graftcode Vision (Configuration tab).
import { TripBudget, GraftConfig } from "@graft/nuget-tripbudgetservice";

// Point the generated client at your gateway host (local container = port 80).
GraftConfig.host = "ws://localhost/ws";
// Stateless: the whole result returns by value in a single round-trip.
GraftConfig.stateless = true;

function App() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    // TripBudget is your backend class; EstimateTotal is its public static method.
    // 5 nights, $120/night lodging, 2 travelers. Returns a primitive (number),
    // so the top-level call is the only awaited boundary — no DTO accessors here.
    TripBudget.EstimateTotal(5, 120, 2).then(setTotal);
  }, []);

  return <h1>Estimated trip cost: ${total?.toFixed(2)}</h1>;
}

export default App;
