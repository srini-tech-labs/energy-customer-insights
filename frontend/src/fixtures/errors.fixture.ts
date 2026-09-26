import { EnergyClientError } from "@/lib/client/energyClient";

// Canned client-side errors matching each row of the proxy's error-mapping
// table (handoff section 4), for exercising ErrorState without needing to
// actually break the Databricks connection.
export const errorFixtures = {
  accessError: new EnergyClientError("UPSTREAM_ACCESS_ERROR", "Energy service access is unavailable", 502),
  rateLimited: new EnergyClientError(
    "UPSTREAM_RATE_LIMITED",
    "Energy service is rate-limited. Please retry shortly.",
    429
  ),
  timeout: new EnergyClientError(
    "UPSTREAM_TIMEOUT",
    "The energy service is taking longer than expected. Please retry.",
    504
  ),
  malformedEnvelope: new EnergyClientError(
    "UPSTREAM_INVALID_RESPONSE",
    "The energy service returned an unexpected response.",
    502
  ),
  invalidRequest: new EnergyClientError(
    "INVALID_REQUEST",
    "Unknown account_id. Use list_accounts to see valid IDs.",
    400
  ),
} as const;
