import { AppError } from "./errors";
import type { EnergyRequest, EnergyOperation } from "./types";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const ALLOWED_OPERATIONS: readonly EnergyOperation[] = [
  "list_accounts",
  "account_details",
  "investigate_usage",
  "explain_usage",
];

// Validates an untrusted request body from the browser and narrows it into
// a well-formed EnergyRequest, or throws an AppError describing exactly
// what the caller needs to correct.
export function validateEnergyRequest(body: unknown): EnergyRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("MALFORMED_REQUEST", "Request must be a JSON object.");
  }

  const record = body as Record<string, unknown>;
  const rawOperation = record.operation;

  if (typeof rawOperation !== "string" || !ALLOWED_OPERATIONS.includes(rawOperation as EnergyOperation)) {
    throw new AppError(
      "UNSUPPORTED_OPERATION",
      `Unknown operation. Use one of: ${ALLOWED_OPERATIONS.join(", ")}.`
    );
  }
  const operation = rawOperation as EnergyOperation;

  if (operation === "list_accounts") {
    return { operation };
  }

  const accountId = record.account_id;
  if (typeof accountId !== "string" || accountId.trim() === "") {
    throw new AppError("MISSING_FIELD", "account_id is required and must be a non-empty string.");
  }

  if (operation === "account_details") {
    return { operation, account_id: accountId };
  }

  // operation is "investigate_usage" | "explain_usage"
  const month = record.month;
  if (typeof month !== "string" || !MONTH_PATTERN.test(month)) {
    throw new AppError("INVALID_MONTH_FORMAT", "month must use YYYY-MM format.");
  }

  return { operation, account_id: accountId, month };
}
